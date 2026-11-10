// A game picture that fits its box whatever its shape: the whole image, centred, over a blurred copy that fills the
// gaps. Xbox art comes square (tiles), tall (box art) or wide (Xbox 360 banners), so cropping it to one shape cuts
// some games badly.
export function FitImg({ src, className }: { src: string | null | undefined; className?: string }) {
  if (!src) return <span className={'fit-art fit-box ph' + (className ? ' ' + className : '')} aria-hidden />;
  return (
    <span className={'fit-art fit-box' + (className ? ' ' + className : '')} aria-hidden>
      <img src={src} alt="" className="fit-bg" loading="lazy" />
      <img src={src} alt="" className="fit-fg" loading="lazy" />
    </span>
  );
}
