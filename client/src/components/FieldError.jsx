// Inline validation message under a form field (from the server's error details)
export default function FieldError({ id, message }) {
  if (!message) return null;
  return <span className="field-error" id={id}>{message}</span>;
}
