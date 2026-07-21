export function showToast(message, type = "success") {
  const event = new CustomEvent("pal-toast", { detail: { message, type } });
  window.dispatchEvent(event);
}
