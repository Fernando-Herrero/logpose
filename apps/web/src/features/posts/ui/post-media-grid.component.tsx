import { useTranslation } from 'next-i18next/pages';

type PostMediaGridProps = {
  images: string[];
  /** Ajustes › cronología: difumina hasta pasar el ratón o enfocar. */
  blurred?: boolean;
};

export function PostMediaGrid({ images, blurred = false }: PostMediaGridProps) {
  const { t } = useTranslation();
  const items = images.slice(0, 4);
  const shellClassName = `overflow-hidden rounded-2xl border border-highlight/10 bg-deep/50${
    blurred ? ' post-media--blurred' : ''
  }`;

  const gridClassName =
    items.length === 1
      ? ''
      : `grid h-[254px] grid-cols-2 gap-px ${items.length > 2 ? 'grid-rows-2 ' : ''}`;

  return (
    <div className={`${gridClassName}${shellClassName}`}>
      {items.map((src, index) => (
        <div
          key={src}
          // Con 3, la primera ocupa la columna izquierda entera, como en Twitter.
          className={`bg-deep/80 overflow-hidden ${
            items.length === 3 && index === 0 ? 'row-span-2' : ''
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={t('posts.image_alt', {
              index: index + 1,
              total: items.length,
            })}
            className={
              items.length === 1
                ? 'max-h-[min(510px,70vh)] w-full object-cover'
                : 'size-full object-cover'
            }
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
