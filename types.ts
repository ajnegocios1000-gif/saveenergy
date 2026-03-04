
export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface UserData {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}
