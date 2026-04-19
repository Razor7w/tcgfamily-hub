// types/api.ts
// import { IUser } from "@/app/models/User";

// Tipos para errores de Mongoose
export interface MongooseValidationError {
  name: 'ValidationError'
  errors: Record<string, { message: string; path: string; value: unknown }>
}

export interface MongooseCastError {
  name: 'CastError'
  message: string
  path: string
  value: unknown
}

export interface MongooseDuplicateKeyError extends Error {
  code: 11000
  keyPattern: Record<string, number>
  keyValue: Record<string, unknown>
}

// Tipos para requests
export interface CreateUserRequest {
  name: string
  email: string
  age?: number
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  age?: number
}

// Tipos para respuestas de la API
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Tipos para query parameters
export interface UserQueryParams {
  page?: number
  limit?: number
  search?: string
}
