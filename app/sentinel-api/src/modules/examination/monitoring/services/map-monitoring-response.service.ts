/**
 * Examination Monitoring Response Mapper Service Facade
 *
 * This barrel facade provides 100% backward compatibility for existing consumers
 * while delegating single-responsibility domain concerns to dedicated submodules:
 * - Types: `../data/monitoring-data.types.ts`
 * - Time & Date formatting: `./monitoring-time.service.ts`
 * - Incident mapping: `./map-monitoring-incident.service.ts`
 * - Lifecycle mapping: `./map-monitoring-lifecycle.service.ts`
 * - Student summary & detail mapping: `./map-monitoring-student.service.ts`
 * - Exam overview aggregation: `./map-monitoring-overview.service.ts`
 */

export * from '../data/monitoring-data.types';
export * from './monitoring-time.service';
export * from './map-monitoring-incident.service';
export * from './map-monitoring-lifecycle.service';
export * from './map-monitoring-student.service';
export * from './map-monitoring-overview.service';
