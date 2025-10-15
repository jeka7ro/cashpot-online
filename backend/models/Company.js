// Simple Company model for PostgreSQL - no mongoose needed
export default class Company {
  constructor(data) {
    this.id = data.id
    this.name = data.name
    this.cui = data.cui
    this.registrationNumber = data.registration_number || data.registrationNumber
    this.address = data.address
    this.city = data.city
    this.county = data.county
    this.phone = data.phone
    this.email = data.email
    this.website = data.website
    this.contactPerson = data.contact_person || data.contactPerson
    this.documents = data.documents || []
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  // Static method to create company from database row
  static fromDB(row) {
    return new Company(row)
  }

  // Method to get safe company data
  toSafeObject() {
    return {
      id: this.id,
      name: this.name,
      cui: this.cui,
      registrationNumber: this.registrationNumber,
      address: this.address,
      city: this.city,
      county: this.county,
      phone: this.phone,
      email: this.email,
      website: this.website,
      contactPerson: this.contactPerson,
      documents: this.documents,
      created_at: this.created_at,
      updated_at: this.updated_at
    }
  }
}