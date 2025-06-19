class User < ApplicationRecord
  enum role: {
    admin: 0,
    technician: 1,
    customer_specialist: 2,
    superadmin: 3
  }
  
  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :role, presence: true
  
  before_validation :downcase_email
  
  def can_delete?(resource)
    return true if superadmin?
    return false unless technician? || customer_specialist? || admin?
    
    # Technicians can delete their own resources within 5 minutes
    if resource.respond_to?(:created_by_id) && resource.created_by_id == id
      resource.created_at > 5.minutes.ago
    else
      admin?
    end
  end
  
  private
  
  def downcase_email
    self.email = email.downcase if email.present?
  end
end
