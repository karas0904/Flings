// utils/wrap.js
export default function wrap(middleware) {
  return function (socket, next) {
    return middleware(socket.request, {}, next);
  };
}
