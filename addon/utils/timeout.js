export default function timeout(ms) {
  return new Promise((acc) =>
    setTimeout(() => acc(), ms)
  );
}
