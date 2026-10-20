'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDashboardStoreQueryKey } from '@/hooks/use-dashboard-store-key'
import type { StoreProductDto } from '@/lib/store-product'

export function storeProductsQueryKey(storeId: string) {
  return ['admin', 'products', storeId] as const
}

async function readError(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  throw new Error(typeof body?.error === 'string' ? body.error : fallback)
}

export async function lookupStoreProduct(barcode: string) {
  const res = await fetch(
    `/api/admin/products?barcode=${encodeURIComponent(barcode)}`
  )
  if (!res.ok) await readError(res, 'No se pudo consultar el código')
  return res.json() as Promise<{
    found: boolean
    product: StoreProductDto | null
  }>
}

export async function fetchStoreProducts(q = '') {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  const res = await fetch(
    `/api/admin/products${params.size ? `?${params}` : ''}`
  )
  if (!res.ok) await readError(res, 'No se pudieron cargar los productos')
  return res.json() as Promise<{ products: StoreProductDto[] }>
}

export function useStoreProducts(q = '') {
  const storeId = useDashboardStoreQueryKey()
  return useQuery({
    queryKey: [...storeProductsQueryKey(storeId), q],
    queryFn: () => fetchStoreProducts(q),
    enabled: storeId !== 'none'
  })
}

export function useCreateStoreProduct() {
  const storeId = useDashboardStoreQueryKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      barcode: string
      name: string
      priceClp: number
    }) => {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
        product?: StoreProductDto
      } | null
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo registrar el producto')
      }
      return data?.product as StoreProductDto
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: storeProductsQueryKey(storeId)
      })
    }
  })
}

export function useUpdateStoreProduct() {
  const storeId = useDashboardStoreQueryKey()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      id: string
      name?: string
      priceClp?: number
    }) => {
      const res = await fetch(`/api/admin/products/${body.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: body.name, priceClp: body.priceClp })
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
        product?: StoreProductDto
      } | null
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo actualizar el producto')
      }
      return data?.product as StoreProductDto
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: storeProductsQueryKey(storeId)
      })
    }
  })
}
