export default function Button({ variant = 'primary', children, className = '', ...props }) {
  const base = variant === 'primary' ? 'btn-primary'
             : variant === 'danger'  ? 'btn-danger'
             : 'btn-secondary';
  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
