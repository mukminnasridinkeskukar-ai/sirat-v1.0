import { Observable } from '@apollo/client'
import { buildMockData } from './helpers'

export class DemoMockLink {
  private data: ReturnType<typeof buildMockData>

  constructor() {
    this.data = buildMockData()
  }

  request(operation: any) {
    return new Observable((observer: any) => {
      setTimeout(() => {
        try {
          const name = operation.operationName || ''
          const result = this.resolve(name, operation.variables)
          observer.next({ data: result })
          observer.complete()
        } catch (err) {
          observer.error(err)
        }
      }, 150)
    })
  }

  private resolve(name: string, vars: any): any {
    const d = this.data
    switch (name) {
      case 'GetPatients': {
        const search = (vars?.search || '').toLowerCase().replace(/%/g, '')
        const filtered = search.length < 2 ? d.patients : d.patients.filter((p: any) => p.full_name.toLowerCase().includes(search) || p.rm_number.toLowerCase().includes(search) || p.nik_encrypted.includes(search))
        return { patients: filtered.slice(0, vars?.limit || 20), patients_aggregate: { aggregate: { count: d.patients.length } } }
      }
      case 'GetPatientById':
        return { patients_by_pk: d.patients.find((p: any) => p.id === vars?.id) || null }
      case 'SearchIcd10': {
        const s = (vars?.search || '').toLowerCase().replace(/%/g, '')
        const filtered = s.length < 2 ? [] : d.icd10_codes.filter((icd: any) => icd.code.toLowerCase().includes(s) || icd.name.toLowerCase().includes(s))
        return { icd10_codes: filtered.slice(0, vars?.limit || 15) }
      }
      case 'GetMedicines': {
        const s = (vars?.search || '').toLowerCase().replace(/%/g, '')
        const filtered = s.length < 1 ? d.medicines : d.medicines.filter((m: any) => m.name.toLowerCase().includes(s) || m.generic_name.toLowerCase().includes(s))
        return { medicines: filtered }
      }
      case 'GetEncounters':
        return { encounters: d.encounters }
      case 'GetQueues':
        return { queues: d.queues }
      case 'GetPrescriptions':
        return { prescriptions: d.prescriptions }
      case 'GetInvoices':
        return { invoices: d.invoices }
      case 'GetAuditLogs':
        return { audit_logs: d.audit_logs }
      case 'GetClinic':
        return { clinics_by_pk: d.clinics_by_pk }
      case 'GetDashboardStats':
        return d.dashboard
      case 'GetSoapByEncounter':
        return { soap_notes: [] }
      default:
        return {}
    }
  }
}
