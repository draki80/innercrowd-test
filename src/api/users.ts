export type User = {
  id: number;
  name: string;
  email: string;
  team: string;
};

const userDb: User[] = [
  { id: 1,  name: 'Ada Lovelace',       email: 'ada@example.com',       team: 'Platform' },
  { id: 2,  name: 'Alan Turing',        email: 'alan@example.com',      team: 'Research' },
  { id: 3,  name: 'Anita Borg',         email: 'anita@example.com',     team: 'Platform' },
  { id: 4,  name: 'Barbara Liskov',     email: 'barbara@example.com',   team: 'Platform' },
  { id: 5,  name: 'Bjarne Stroustrup',  email: 'bjarne@example.com',    team: 'Platform' },
  { id: 6,  name: 'Brendan Eich',       email: 'brendan@example.com',   team: 'Web' },
  { id: 7,  name: 'Daniel Bernoulli',   email: 'daniel@example.com',    team: 'Research' },
  { id: 8,  name: 'Donald Knuth',       email: 'donald@example.com',    team: 'Research' },
  { id: 9,  name: 'Edsger Dijkstra',    email: 'edsger@example.com',    team: 'Research' },
  { id: 10, name: 'Evan You',           email: 'evan@example.com',      team: 'Web' },
  { id: 11, name: 'Grace Hopper',       email: 'grace@example.com',     team: 'Platform' },
  { id: 12, name: 'Guido van Rossum',   email: 'guido@example.com',     team: 'Platform' },
  { id: 13, name: 'Hedy Lamarr',        email: 'hedy@example.com',      team: 'Research' },
  { id: 14, name: 'James Gosling',      email: 'james@example.com',     team: 'Platform' },
  { id: 15, name: 'John McCarthy',      email: 'john@example.com',      team: 'Research' },
  { id: 16, name: 'Ken Thompson',       email: 'ken@example.com',       team: 'Platform' },
  { id: 17, name: 'Linus Torvalds',     email: 'linus@example.com',     team: 'Platform' },
  { id: 18, name: 'Margaret Hamilton',  email: 'margaret@example.com',  team: 'Research' },
  { id: 19, name: 'Niklaus Wirth',      email: 'niklaus@example.com',   team: 'Platform' },
  { id: 20, name: 'Radia Perlman',      email: 'radia@example.com',     team: 'Network' },
  { id: 21, name: 'Tim Berners-Lee',    email: 'tim@example.com',       team: 'Web' },
];

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export type FetchUsersOptions = {
  /** Override the default 200–700ms random latency per call. */
  latencyMs?: () => number;
  /** Force the call to reject after the latency. Used by demo to surface the error UI. */
  fail?: boolean;
};

export async function fetchUsers(
  query: string,
  signal: AbortSignal,
  opts: FetchUsersOptions = {},
): Promise<User[]> {
  const latency = opts.latencyMs ? opts.latencyMs() : 200 + Math.random() * 500;
  await delay(latency, signal);
  if (opts.fail) {
    throw new Error('Backend unavailable (demo)');
  }
  const q = query.toLowerCase();
  return userDb.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.team.toLowerCase().includes(q),
  );
}
