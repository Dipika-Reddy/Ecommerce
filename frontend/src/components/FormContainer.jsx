// Centers a narrow card on the page — used by Login, Register, Shipping, Payment forms
const FormContainer = ({ children }) => (
  <div className="mx-auto max-w-md px-4 py-10">
    <div className="rounded-lg border bg-white p-6 shadow-sm">{children}</div>
  </div>
);

export default FormContainer;
