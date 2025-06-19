class CasePerson < ApplicationRecord
  belongs_to :case
  belongs_to :person
end
