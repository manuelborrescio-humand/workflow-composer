# Workflow Composer

**Equipo:** humand.after.all — Manuel, Cristiano, Martin, Hernan
**Evento:** Humand AI Hackathon 2026 | 18–19 marzo
**Premio total del evento:** $6,500 USD

---

## Que es Workflow Composer

Workflow Composer es una web app que convierte descripciones en lenguaje natural de procesos de HR en diagramas visuales de workflows, usando el formato HWL (Humand Workflow Language) real de la plataforma Humand.

**El problema:** Configurar workflows en Humand hoy es 100% manual — nodo a nodo, paso a paso. Es lento y depende de que el admin sepa exactamente que quiere.

**La solucion:** Un agente de IA (Claude API) que interpreta texto libre y genera automaticamente el JSON del workflow, renderizado como diagrama interactivo con React Flow.

---

## Como funciona

### 1. Input en lenguaje natural
Caja de texto donde se describe el proceso de HR en palabras simples.

> *"Cuando ingresa un empleado nuevo, mandarle el formulario de bienvenida. Si no lo completa en 48 horas, notificar al manager."*

### 2. Agente IA (Claude API)
Claude recibe el texto y genera el JSON en formato HWL — el lenguaje interno real que usa Humand para definir workflows. El schema exacto va en el system prompt.

### 3. Diagrama visual interactivo
El JSON se renderiza como diagrama con nodos y flechas usando React Flow. El admin puede escribir mas instrucciones para refinarlo (multi-turn) y el diagrama se actualiza sin borrar lo anterior.

### 4. Templates precargados
3 templates listos para usar: Onboarding, Aprobacion de gastos, Solicitud de vacaciones.

---

## Stack tecnico

| Herramienta | Uso |
|---|---|
| **Next.js + TypeScript** | Framework de la app |
| **Claude API** | Agente que genera el JSON HWL |
| **React Flow** | Renderizado del diagrama visual |
| **V0 (Vercel)** | Generacion de la UI |
| **Vercel** | Deploy |
| **Zod** | Validacion del JSON generado |

---

## Contexto: Humand Workflows

El modulo de Workflows de Humand permite automatizar procesos asociados a solicitudes dentro del modulo de Service Management. Los administradores crean flujos de trabajo que ejecutan tareas, aprobaciones o notificaciones automaticamente en base a un disparador.

### Relacion Servicio-Workflow
- La relacion entre Servicio y Workflow es **estrictamente 1:1**
- Un servicio solo puede estar vinculado a un workflow y viceversa
- Cada vez que un colaborador inicia ese servicio, se ejecuta el workflow asociado

### Componentes del modulo

#### Disparadores
Evento inicial que activa el workflow, vinculado a un Servicio de Service Management.

#### Logica (Ramas / Condicionales)
Divide el flujo en caminos alternativos segun condiciones configuradas:
- Hasta **10 ramas** por componente, **6 condiciones** por rama
- Evaluacion AND (todas deben cumplirse) u OR (al menos una)
- Campos evaluables: datos de la solicitud o del solicitante
- Siempre existe una **rama por defecto**
- Las ramas se evaluan secuencialmente

#### Acciones
1. **Solicitar aprobacion** — pausa el flujo hasta que aprobadores decidan (Aprobado/Rechazado)
   - Condicion: "Todos deben aprobar" (ALL) o "Al menos uno" (ANY)
   - Aprobadores: usuarios especificos, jefe directo, jefe de segundo nivel, aprobador designado
2. **Actualizar solicitud** — modifica el estado automaticamente
   - Transiciones: Sin asignar/Asignada -> En proceso/En espera/Cerrada/Cancelada

### Estados del workflow
| Estado | Publicado | Se ejecuta | Edicion |
|---|---|---|---|
| **Borrador** | No | No | Libre (guardar y salir) |
| **Activo** | Si | Si | Requiere "Actualizar" |
| **Inactivo** | Si | No | Requiere "Actualizar" |

### Requisitos para publicar
1. El disparador esta definido
2. Al menos una accion configurada
3. Todos los componentes completos y validados

---

## HWL — Humand Workflow Language

HWL es el formato JSON interno que usa Humand para definir workflows. El agente de IA genera este formato a partir de texto libre.

### Schema

```json
{
  "start": {
    "id": "start-node",
    "name": "Inicio",
    "position": { "x": 300, "y": 40 }
  },
  "tasks": [
    {
      "id": "task-1",
      "name": "Nombre descriptivo",
      "type": "SEND_FORM | SEND_NOTIFICATION | REQUEST_APPROVAL | UPDATE_STATUS | CREATE_USER | ASSIGN_AGENT",
      "config": {},
      "position": { "x": number, "y": number }
    }
  ],
  "conditionals": [
    {
      "id": "cond-1",
      "type": "EXCLUSIVE_GATEWAY",
      "label": "Pregunta de decision?",
      "logic": "AND",
      "branches": [
        {
          "edgeId": "edge-X",
          "condition": "expresion booleana",
          "name": "Etiqueta rama"
        }
      ],
      "defaultBranch": {
        "edgeId": "edge-Y",
        "condition": "true",
        "name": "Etiqueta rama por defecto"
      },
      "position": { "x": number, "y": number }
    }
  ],
  "edges": [
    { "id": "edge-1", "sourceId": "start-node", "targetId": "task-1" }
  ],
  "end": [
    { "id": "end-1", "name": "Descripcion del fin", "position": { "x": number, "y": number } }
  ]
}
```

### Tipos de tareas disponibles
- `SEND_FORM` — Enviar formulario
- `SEND_NOTIFICATION` — Enviar notificacion push o email
- `REQUEST_APPROVAL` — Solicitar aprobacion (pausa el flujo)
- `UPDATE_STATUS` — Actualizar estado de la solicitud
- `CREATE_USER` — Crear usuario nuevo en Humand
- `ASSIGN_AGENT` — Asignar agente responsable

### Reglas de generacion
- **IDs:** formato `^[A-Za-z][A-Za-z0-9-]+$`, prefijos descriptivos (task-, cond-, edge-, end-)
- **Posicionamiento:** start en x=300, y=40; flujo vertical cada 120px; bifurcaciones en x=120 (izq) y x=480 (der)
- **Conexiones:** todo nodo conectado, edges de condicionales usan los edgeIds declarados en branches
- **REQUEST_APPROVAL:** siempre genera un condicional posterior con ramas Aprobado/Rechazado
- **Multi-turn:** modificaciones preservan nodos existentes, solo agregan/reconectan lo necesario

---

## Plan de ejecucion

### Dia 1 — Que el agente funcione y se vea bien

**Manana (9-13h)**
- Cristiano: generar UI en V0 (input, area de diagrama, boton "Generar")
- Hernan: crear proyecto Next.js + TypeScript, integrar UI de V0
- Hernan: conectar Claude API con system prompt HWL
- Primer test: proceso simple -> JSON valido

**Tarde (14-18h)**
- Hernan: instalar React Flow y renderizar JSON como diagrama
- Cristiano + Manuel + Martin: preparar 5 casos de prueba reales
- Testear 5 casos, ajustar prompt
- **Objetivo:** escribis texto -> aparece el diagrama

### Dia 2 — Refinamiento + polish + demo ready

**Manana (9-13h)**
- Hernan: multi-turn (refinar diagrama sin borrar)
- Cristiano + Manuel: 3 templates precargados
- Cristiano: polish visual

**Tarde (14-18h)**
- Deploy en Vercel (30 min)
- Ensayo demo (minimo 2 pasadas)
- **Nada nuevo despues del mediodia.** Solo pulir.

---

## Demo — Guion de 3 minutos

| Tiempo | Contenido |
|---|---|
| 0:00-0:30 | Problema: configurar workflows es manual, lento y complejo |
| 0:30-1:30 | Demo en vivo: escribir proceso -> diagrama en 4 segundos |
| 1:30-2:00 | Refinar en vivo: "Agrega aprobacion del manager" |
| 2:00-2:30 | Template precargado: onboarding completo con 1 click |
| 2:30-3:00 | Cierre: impacto en retención, workflows activos = churn bajo |

---

## Equipo

| Persona | Rol |
|---|---|
| **Hernan** | Todo el codigo. Recibe UI de V0 y system prompt. Claude Code genera las partes complejas. |
| **Cristiano** | UI en V0, prompt engineering, casos de prueba, coordinacion, demo. |
| **Manuel** | Casos de uso reales de clientes, templates, presentacion. |
| **Martin** | Templates, casos de prueba, presentacion. |

---

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Claude genera JSON con errores | Validar con Zod antes de React Flow. Si falla, mandar error al agente para autocorreccion. |
| React Flow no renderiza bien flujos complejos | Demo usa procesos de 4-6 nodos max. Templates diseñados para verse bien. |
| No terminan en tiempo | Dia 2 tarde = 100% buffer y ensayo. Nada nuevo. |

---

## Por que tiene chances de ganar

- Unico proyecto de los 101 equipos que toca la infraestructura tecnica real de Humand (HWL / Rocket / Camunda)
- El jurado tecnico lo entiende de inmediato
- El jurado de negocio ve el impacto: workflows activos = retencion de clientes
- La demo es facil de entender para cualquiera
- Scope de demo funcional: ejecutable con 1 dev en 2 dias

---

## Links

- [Guia del equipo (Notion)](https://www.notion.so/humand-co/Workflow-Composer-Gu-a-del-equipo-Huckathon-3266757f313081eb81f3f5bf22ffeaf3)
- [Documentacion Workflows Humand (Notion)](https://www.notion.so/humand-co/ES-Workflows-2756757f3130808088f6fd4170db3a23)
- [Humand AI Hackathon 2026](https://huckathon.ai/)
