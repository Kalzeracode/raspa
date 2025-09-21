-- Enable leaked password protection for better security
UPDATE auth.config SET enable_password_checks = true;