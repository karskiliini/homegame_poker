import { describe, it, expect, vi } from 'vitest';
import { MockSocket } from '../../views/editor/MockSocket.js';

describe('MockSocket', () => {
  it('delivers events to listeners', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('test', handler);
    socket.emit('test', { foo: 'bar' });
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('supports multiple listeners for same event', () => {
    const socket = new MockSocket();
    const h1 = vi.fn();
    const h2 = vi.fn();
    socket.on('evt', h1);
    socket.on('evt', h2);
    socket.emit('evt', 42);
    expect(h1).toHaveBeenCalledWith(42);
    expect(h2).toHaveBeenCalledWith(42);
  });

  it('removes listener with off()', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('test', handler);
    socket.off('test', handler);
    socket.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('reset() clears all listeners', () => {
    const socket = new MockSocket();
    const handler = vi.fn();
    socket.on('test', handler);
    socket.reset();
    socket.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });
});
