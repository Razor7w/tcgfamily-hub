import 'server-only'

import { S3Client } from '@aws-sdk/client-s3'

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim()
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export function r2Client(): S3Client {
  const accountId = requiredEnv('R2_ACCOUNT_ID')
  const accessKeyId = requiredEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = requiredEnv('R2_SECRET_ACCESS_KEY')

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    /**
     * Evita incluir checksum CRC32 en URLs firmadas para PUT desde el navegador.
     * Con el default (WHEN_SUPPORTED) el SDK añade query params de checksum que el
     * cliente no envía → 403 y el navegador muestra error de CORS en la respuesta.
     */
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED'
  })
}

export function r2BucketName(): string {
  return requiredEnv('R2_BUCKET_NAME')
}

export function r2PublicBaseUrl(): string {
  return requiredEnv('R2_PUBLIC_BASE_URL').replace(/\/+$/, '')
}
