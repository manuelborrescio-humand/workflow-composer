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

export async function executeRedashQuery(
  queryId: number,
  parameters: Record<string, unknown> = {}
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${REDASH_BASE_URL}/api/queries/${queryId}/results`,
    {
      method: "POST",
      headers: {
        Authorization: `Key ${REDASH_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parameters, max_age: 1800 }),
    }
  );

  if (!res.ok) {
    throw new Error(`Redash query ${queryId} failed: ${res.status}`);
  }

  const data: RedashQueryResult = await res.json();
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

// These query IDs need to be created in Redash with parameterized queries.
// Each query should accept an `instanceId` parameter.
// Set these IDs in .env.local after creating the queries.
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
