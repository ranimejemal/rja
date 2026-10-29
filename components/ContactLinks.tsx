/** Direct contact options, shown next to quote forms. WhatsApp works on every device, unlike mailto links. */
export function ContactLinks() {
  return (
    <div className="small muted stack" style={{ "--gap": "0.35rem" } as React.CSSProperties}>
      <span>Or contact us directly:</span>
      <a className="link" href="https://wa.me/21697017061" target="_blank" rel="noopener">WhatsApp +216 97 017 061 ↗</a>
      <a className="link" href="https://wa.me/33624979941" target="_blank" rel="noopener">WhatsApp +33 6 24 97 99 41 ↗</a>
      <a className="link" href="https://www.instagram.com/ranimejemalagency/" target="_blank" rel="noopener">Instagram @ranimejemalagency ↗</a>
      <a className="link" href="mailto:ranimejmal@gmail.com">ranimejmal@gmail.com</a>
    </div>
  );
}
