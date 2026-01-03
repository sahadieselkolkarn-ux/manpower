import type { SVGProps } from "react";

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      {...props}
      aria-label="ManpowerFlow Logo"
    >
      <g fill="none">
        <path fill="hsl(var(--primary))" d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Z" />
        <path fill="hsl(var(--accent))" d="M168 96h-24v64h-16V96H96v-16h72Z" />
      </g>
    </svg>
  ),
};
