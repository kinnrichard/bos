u = User.find_by(email: 'test@example.com')
if u
  u.password = 'secret123'
  u.save!
  puts 'Password updated'
else
  puts 'User not found'
end