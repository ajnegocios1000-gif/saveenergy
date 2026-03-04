
export const ADMIN_EMAILS = ['pereira.itapema@gmail.com', 'ajnegocios1000@gmail.com'];

export const isAdmin = (email: string | undefined | null) => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.trim().toLowerCase() === cleanEmail);
};
