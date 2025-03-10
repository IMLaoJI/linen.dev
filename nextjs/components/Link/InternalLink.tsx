import Link from 'next/link';
import usePath from 'hooks/path';

interface Props {
  className?: string;
  onClick?(): void;
  onDragEnter?(event: React.DragEvent): void;
  onDragLeave?(event: React.DragEvent): void;
  onDrop?(event: React.DragEvent): void;
  href: string;
  children: React.ReactNode;
}

export default function InternalLink({
  className,
  onClick,
  onDragEnter,
  onDragLeave,
  onDrop,
  href,
  children,
}: Props) {
  const path = usePath({ href });
  return (
    <Link
      href={path}
      prefetch={false}
      onClick={onClick}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={className}
    >
      {children}
    </Link>
  );
}
