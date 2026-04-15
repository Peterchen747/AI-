import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNTD(amount: number): string {
  return `NT$ ${amount.toLocaleString("zh-TW")}`
}

export function calculateProfit(actualPrice: number, cost: number): number {
  return actualPrice - cost
}

export function calculateMargin(actualPrice: number, cost: number): number {
  if (actualPrice === 0) return 0
  return ((actualPrice - cost) / actualPrice) * 100
}
