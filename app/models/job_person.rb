class JobPerson < ApplicationRecord
  belongs_to :job
  belongs_to :person
end
