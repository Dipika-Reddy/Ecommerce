// Color-coded alert banner used for errors, success confirmations, and info notes
const variantStyles = {
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

const Message = ({ variant = 'info', children }) => (
  <div className={`rounded-md border px-4 py-3 text-sm ${variantStyles[variant]}`}>{children}</div>
);

export default Message;
