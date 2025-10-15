// Simple User model for PostgreSQL - no mongoose needed
export default class User {
  constructor(data) {
    this.id = data.id
    this.username = data.username
    this.password = data.password
    this.fullName = data.full_name || data.fullName
    this.email = data.email
    this.role = data.role || 'user'
    this.permissions = data.permissions || {}
    this.avatar = data.avatar || null
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  // Static method to create user from database row
  static fromDB(row) {
    return new User(row)
  }

  // Method to get safe user data (without password)
  toSafeObject() {
    return {
      id: this.id,
      username: this.username,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
      permissions: this.permissions,
      avatar: this.avatar,
      created_at: this.created_at,
      updated_at: this.updated_at
    }
  }
}