const appIconUrl = new URL("../../../../../assets/icon.png", import.meta.url)
  .href;

export function TitlebarAppIcon() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-background">
      <img
        alt=""
        aria-hidden="true"
        className="size-full object-cover"
        draggable={false}
        src={appIconUrl}
      />
    </div>
  );
}
