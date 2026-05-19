// NavigationContext sudah diganti dengan react-router-dom.
// File ini hanya sebagai alias agar tidak ada import error jika masih dipakai.
export { useNavigate as useNav } from 'react-router-dom';
export function NavProvider({ children }) { return children; }
