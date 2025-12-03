# Payment Webhook Service

Este microservicio se encarga de recibir y procesar webhooks de pagos. Registra las transacciones en una base de datos Supabase y asocia los pagos con clientes existentes basándose en su correo electrónico o número de teléfono.

## Requisitos Previos

- Node.js (versión recomendada 16+ o 18+)
- Una instancia de Supabase configurada con las tablas:
  - `payment_logs`: Para el registro de transacciones.
  - `dentix_clients`: Para la búsqueda de clientes existentes.

## Instalación

1. Instala las dependencias del proyecto:

```bash
npm install
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto y configura las siguientes variables de entorno:

```env
PORT=3032
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
PAYMENTS_WAY_TOKEN=tu-token-secreto-para-webhook
```

## Ejecución

Para iniciar el servidor:

```bash
node src/index.js
```

El servidor se iniciará por defecto en el puerto `3032` (o el que definas en `PORT`).

## API Endpoints

### 1. Webhook de Pagos

Este endpoint recibe la información de la transacción y actualiza el estado en la base de datos.

- **URL:** `/api/payments/webhook`
- **Método:** `POST`
- **Autenticación:** Requiere header `Authorization: Bearer <PAYMENTS_WAY_TOKEN>`

#### Cuerpo de la Solicitud (JSON)

Ejemplo de la estructura esperada:

```json
{
  "id": "transaccion_123",
  "externalorder": "orden_456",
  "amount": 15000,
  "fullname": "Juan Perez",
  "idstatus": {
    "id": 34,
    "nombre": "Aprobada"
  },
  "idperson": {
    "email": "juan.perez@example.com",
    "phone": "5551234567"
  },
  "paymentmethod": {
    "nombre": "Tarjeta de Crédito"
  }
}
```

#### Respuestas

| Código | Descripción |
|--------|-------------|
| `200`  | Pago completado exitosamente (status id 34). |
| `201`  | Webhook recibido y registrado (otros estados). |
| `400`  | Payload inválido o datos incompletos. |
| `401`  | No autorizado (Token incorrecto o faltante). |
| `500`  | Error interno del servidor o error de base de datos. |

### 2. Health Check

Endpoint para verificar que el servicio está activo.

- **URL:** `/api/peyments/health`
- **Método:** `GET`
