const REDASH_BASE_URL = "https://redash.humand.co";
const REDASH_API_KEY = process.env.REDASH_API_KEY!;

interface RedashQueryResult {
  query_result: {
    data: {
      columns: { name: string; type: string }[];
      rows: Record<string, unknown>[];
    };
  };
}

interface RedashJobResponse {
  job: {
    id: string;
    status: number; // 1=pending, 2=started, 3=success, 4=failure
    query_result_id: number | null;
    error: string;
  };
}

function isJobResponse(
  data: RedashQueryResult | RedashJobResponse
): data is RedashJobResponse {
  return "job" in data;
}

async function pollJobResult(jobId: string): Promise<Record<string, unknown>[]> {
  const maxAttempts = 15;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch(`${REDASH_BASE_URL}/api/jobs/${jobId}`, {
      headers: { Authorization: `Key ${REDASH_API_KEY}` },
    });

    if (!res.ok) throw new Error(`Job poll failed: ${res.status}`);

    const data = await res.json();
    const job = data.job;

    if (job.status === 3 && job.query_result_id) {
      const resultRes = await fetch(
        `${REDASH_BASE_URL}/api/query_results/${job.query_result_id}`,
        { headers: { Authorization: `Key ${REDASH_API_KEY}` } }
      );
      if (!resultRes.ok) throw new Error(`Result fetch failed: ${resultRes.status}`);
      const resultData: RedashQueryResult = await resultRes.json();
      return resultData.query_result.data.rows;
    }

    if (job.status === 4) {
      throw new Error(`Redash query failed: ${job.error}`);
    }
  }
  throw new Error("Redash query timed out");
}

export async function executeRedashQuery(
  queryId: number,
  parameters: Record<string, unknown> = {}
): Promise<Record<string, unknown>[]> {
  // Redash expects parameters as strings
  const stringParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(parameters)) {
    stringParams[key] = String(value);
  }

  const res = await fetch(
    `${REDASH_BASE_URL}/api/queries/${queryId}/results`,
    {
      method: "POST",
      headers: {
        Authorization: `Key ${REDASH_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parameters: stringParams, max_age: 1800 }),
    }
  );

  if (!res.ok) {
    throw new Error(`Redash query ${queryId} failed: ${res.status}`);
  }

  const data: RedashQueryResult | RedashJobResponse = await res.json();

  if (isJobResponse(data)) {
    return pollJobResult(data.job.id);
  }

  return data.query_result.data.rows;
}

export interface InstanceContext {
  users: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    bossId: number | null;
    isAgent: boolean;
    status: string;
    hiringDate: string | null;
  }[];
  departments: {
    id: number;
    name: string;
    usersCount: number;
  }[];
  tickets: {
    topicId: number;
    subject: string;
    status: string;
    count: number;
  }[];
  services: {
    id: number;
    code: string;
    description: string;
  }[];
}

export const REDASH_QUERY_IDS = {
  users: Number(process.env.REDASH_QUERY_USERS) || 0,
  departments: Number(process.env.REDASH_QUERY_DEPARTMENTS) || 0,
  tickets: Number(process.env.REDASH_QUERY_TICKETS) || 0,
  services: Number(process.env.REDASH_QUERY_SERVICES) || 0,
};

export async function fetchInstanceContext(
  instanceId: number
): Promise<InstanceContext> {
  const params = { instanceId };

  const [users, departments, tickets, services] = await Promise.all([
    REDASH_QUERY_IDS.users
      ? executeRedashQuery(REDASH_QUERY_IDS.users, params)
      : Promise.resolve([]),
    REDASH_QUERY_IDS.departments
      ? executeRedashQuery(REDASH_QUERY_IDS.departments, params)
      : Promise.resolve([]),
    REDASH_QUERY_IDS.tickets
      ? executeRedashQuery(REDASH_QUERY_IDS.tickets, params)
      : Promise.resolve([]),
    REDASH_QUERY_IDS.services
      ? executeRedashQuery(REDASH_QUERY_IDS.services, params)
      : Promise.resolve([]),
  ]);

  return {
    users: users as unknown as InstanceContext["users"],
    departments: departments as unknown as InstanceContext["departments"],
    tickets: tickets as unknown as InstanceContext["tickets"],
    services: services as unknown as InstanceContext["services"],
  };
}
