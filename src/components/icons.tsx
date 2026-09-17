import type { SVGProps } from "react";

const paths: Record<string, string> = {
  dash: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z",
  customers: "M3 17V5.5A1.5 1.5 0 0 1 4.5 4h6A1.5 1.5 0 0 1 12 5.5V17M12 9h3.5A1.5 1.5 0 0 1 17 10.5V17M2 17h16M6 7.5h3M6 10.5h3M6 13.5h3",
  projects: "M2.5 7.5A1.5 1.5 0 0 1 4 6h12a1.5 1.5 0 0 1 1.5 1.5V15A1.5 1.5 0 0 1 16 16.5H4A1.5 1.5 0 0 1 2.5 15zM7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6M2.5 10h15",
  tasks: "M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM6.5 10.2l2.3 2.3 4.7-4.9",
  notes: "M4 3.5h12v9l-4 4H4zM12 16.5v-4h4M7 7.5h6M7 10.5h4",
  files: "M5 3h7l4 4v10H5zM12 3v4h4",
  users: "M11 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M2.5 16.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5M13.5 4.5a3 3 0 0 1 0 5M15 12.2c1.6.7 2.5 2 2.5 4.3",
  audit: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0M10 6v4l2.5 2",
  data: "M4 7h11l-3-3M16 13H5l3 3",
  menu: "M3 5h14M3 10h14M3 15h14",
  search: "M14.5 9a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0M13.5 13.5L17 17",
  alert: "M10 3l7.5 13h-15zM10 8v3.5M10 13.5v.5",
  spark: "M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6zM16 14l.6 1.4L18 16l-1.4.6L16 18l-.6-1.4L14 16l1.4-.6z",
  phone: "M5 3h3l1.5 4-2 1.2a9 9 0 0 0 4.3 4.3L13 10.5l4 1.5v3a1.5 1.5 0 0 1-1.5 1.5A12.5 12.5 0 0 1 3.5 4.5 1.5 1.5 0 0 1 5 3z",
  mail: "M3 6.5A1.5 1.5 0 0 1 4.5 5h11A1.5 1.5 0 0 1 17 6.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 13.5zM3 6.5l7 4.5 7-4.5",
  pin: "M10 17s5-4.6 5-8.5a5 5 0 0 0-10 0C5 12.4 10 17 10 17zM11.8 8.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0",
  chat: "M3.5 4.5h13v8h-7l-3.5 3v-3h-2.5z",
  memo: "M4 4h12v12H4zM7 8h6M7 11h4",
  check: "M4 10.5l4 4 8-8.5",
  download: "M10 3v10M6 9l4 4 4-4M4 17h12",
  upload: "M10 13V3M6 7l4-4 4 4M4 17h12",
  pinned: "M8 3h4l-.5 4 2.5 3v1H6v-1l2.5-3zM10 11v6",
  edit: "M4 16h3l8-8-3-3-8 8zM11 6l3 3",
  trash: "M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6",
};

type Props = SVGProps<SVGSVGElement> & { name: keyof typeof paths | string; size?: number };

export function Icon({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={paths[name] ?? paths.memo} />
    </svg>
  );
}
