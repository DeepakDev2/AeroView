// Type declarations for non-TypeScript imports

declare module '*.css' {
  const styles: { [className: string]: string };
  export default styles;
}
