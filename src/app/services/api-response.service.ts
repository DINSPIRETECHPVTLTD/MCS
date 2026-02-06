import { Injectable } from '@angular/core';

/**
 * Normalizes backend response shapes into plain JS values.
 *
 * Supports common .NET collection JSON patterns like:
 * - { "$values": [...] }
 * - { data: { "$values": [...] } }
 * - { items: [...] }
 */
@Injectable({
  providedIn: 'root'
})
export class ApiResponseService {
  unwrapList<T>(response: unknown): T[] {
    const raw = this.pickContainer(response);

    if (Array.isArray(raw)) return raw as T[];

    const record = this.asRecord(raw);
    const values = record?.['$values'];
    return Array.isArray(values) ? (values as T[]) : [];
  }

  private pickContainer(response: unknown): unknown {
    const root = this.asRecord(response);
    if (!root) return response;

    const directValues = root['$values'];
    if (directValues !== undefined) return directValues;

    const data = root['data'];
    const dataRecord = this.asRecord(data);
    const dataValues = dataRecord?.['$values'];
    if (dataValues !== undefined) return dataValues;
    if (data !== undefined) return data;

    const items = root['items'];
    const itemsRecord = this.asRecord(items);
    const itemsValues = itemsRecord?.['$values'];
    if (itemsValues !== undefined) return itemsValues;
    if (items !== undefined) return items;

    return response;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
