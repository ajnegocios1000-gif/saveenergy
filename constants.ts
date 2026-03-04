
export const ADMIN_EMAILS = ['pereira.itapema@gmail.com', 'ajnegocios1000@gmail.com'];

export const isAdmin = (email: string | undefined | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
};
