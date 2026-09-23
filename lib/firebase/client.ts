import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  type QueryConstraint,
  type DocumentData,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

function serialise(value: any): any {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialise);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serialise(item)])
    );
  }
  return value;
}

function userRecord(user: User | null) {
  if (!user) return null;

  return {
    id: user.uid,
    uid: user.uid,
    email: user.email,
    email_confirmed_at: user.emailVerified
      ? new Date().toISOString()
      : null,
    user_metadata: {
      name: user.displayName || "",
    },
  };
}

async function ensureProfile(user: User, name = "") {
  const ref = doc(db, "profiles", user.uid);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, {
      id: user.uid,
      name: name || user.displayName || "",
      email: user.email || "",
      club: "",
      role: "driver",
      created_at: serverTimestamp(),
    });
  }
}

type Filter =
  | { kind: "eq"; field: string; value: any }
  | { kind: "in"; field: string; values: any[] }
  | { kind: "neq"; field: string; value: any }
  | { kind: "is"; field: string; value: any };

class CompatQuery {
  private table: string;
  private filters: Filter[] = [];
  private orderField: string | null = null;
  private orderAsc = true;
  private maxRows: number | null = null;
  private operation: "read" | "insert" | "upsert" | "update" | "delete" = "read";
  private payload: any = null;
  private conflictFields: string[] = [];
  private selectAfterWrite = false;
  private singleMode: "single" | "maybeSingle" | null = null;
  private orExpression: string | null = null;
  private countRequested = false;
  private headOnly = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_fields = "*", options?: { count?: "exact"; head?: boolean }) {
    if (options?.count === "exact") this.countRequested = true;
    if (options?.head) this.headOnly = true;
    if (this.operation !== "read") this.selectAfterWrite = true;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ kind: "eq", field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ kind: "in", field, values });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ kind: "neq", field, value });
    return this;
  }

  is(field: string, value: any) {
    this.filters.push({ kind: "is", field, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.maxRows = n;
    return this;
  }

  or(expression: string) {
    this.orExpression = expression;
    return this;
  }

  insert(data: any | any[]) {
    this.operation = "insert";
    this.payload = data;
    return this;
  }

  upsert(data: any | any[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = data;
    this.conflictFields = (options?.onConflict || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return this;
  }

  update(data: any) {
    this.operation = "update";
    this.payload = data;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  single() {
    this.singleMode = "single";
    return this.execute();
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this.execute();
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    try {
      if (!auth.currentUser) {
        return { data: this.operation === "read" ? [] : null, error: new Error("Not authenticated.") };
      }

      if (this.operation === "insert" || this.operation === "upsert") {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        const results: any[] = [];

        for (const original of rows) {
          const data = { ...original };

          if (this.table === "conversations" && data.team_id && !data.manager_id) {
            const team = await getDoc(doc(db, "teams", data.team_id));
            data.manager_id = team.exists() ? team.data().manager_id : null;
          }

          if (this.table === "team_driver_requests" && data.team_id && !data.manager_id) {
            const team = await getDoc(doc(db, "teams", data.team_id));
            data.manager_id = team.exists() ? team.data().manager_id : null;
          }

          const ref = this.conflictFields.length
            ? await this.findUpsertRef(data)
            : null;

          const target = ref || doc(collection(db, this.table));
          const id = target.id;
          const now = data.created_at || new Date().toISOString();
          const stored = {
            ...data,
            id,
            created_at: data.created_at ?? now,
          };

          if (this.table === "messages") {
            stored.created_at = data.created_at ?? now;
          }

          await setDoc(target, stored, { merge: this.operation === "upsert" });
          results.push({ ...serialise(stored) });
        }

        const data = Array.isArray(this.payload) ? results : results[0];
        return { data: this.selectAfterWrite ? data : null, error: null };
      }

      if (this.operation === "update") {
        const docs = await this.getMatchingDocs();
        for (const item of docs) {
          await updateDoc(item.ref, this.payload);
        }
        const data = docs.map((item) => ({ id: item.ref.id, ...serialise({ ...item.data, ...this.payload }) }));
        return { data: this.singleMode ? data[0] ?? null : data, error: null };
      }

      if (this.operation === "delete") {
        const docs = await this.getMatchingDocs();
        for (const item of docs) await deleteDoc(item.ref);
        return { data: null, error: null };
      }

      const docs = await this.getMatchingDocs();
      let data = docs.map((item) => ({ id: item.ref.id, ...serialise(item.data) }));

      if (this.table === "conversations" && this.selectAfterWrite === false) {
        data = await this.addConversationRelations(data);
      }

      if (this.singleMode === "single") {
        if (data.length !== 1) {
          return { data: null, error: new Error(`Expected exactly one ${this.table} document.`) };
        }
        return { data: data[0], error: null };
      }

      if (this.singleMode === "maybeSingle") {
        if (data.length > 1) {
          return { data: null, error: new Error(`Expected zero or one ${this.table} document.`) };
        }
        return { data: data[0] ?? null, error: null };
      }

      if (this.countRequested) {
        return { data: this.headOnly ? null : data, count: data.length, error: null };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  private async findUpsertRef(data: any) {
    if (!this.conflictFields.length) return null;
    const key = this.conflictFields
      .map((field) => String(data[field] ?? ""))
      .join("_")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!key) return null;
    return doc(db, this.table, key);
  }

  private parseOrExpression() {
    if (!this.orExpression) return null;
    const expr = this.orExpression;
    const driver = expr.match(/driver_id\.eq\.([^,]+)/);
    const team = expr.match(/team_id\.in\.\(([^)]+)\)/);
    return {
      driverId: driver?.[1] || null,
      teamIds: team ? team[1].split(",").filter(Boolean) : [],
    };
  }

  private async getMatchingDocs() {
    const base = collection(db, this.table);
    const or = this.parseOrExpression();
const idFilter = this.filters.find(
  (
    f
  ): f is Extract<Filter, { kind: "eq" }> =>
    f.kind === "eq" && f.field === "id"
);

if (idFilter && !or) {
  const ref = doc(
    db,
    this.table,
    String(idFilter.value)
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return [];
  }

  return this.finishDocs([
    {
      ref: snap.ref,
      data: snap.data(),
    },
  ]);
}

    if (this.table === "conversations" && or) {
      const results = new Map<string, any>();

      if (or.driverId) {
        const snap = await getDocs(query(base, where("driver_id", "==", or.driverId)));
        snap.docs.forEach((d) => results.set(d.id, { ref: d.ref, data: d.data() }));
      }

      if (auth.currentUser) {
        const snap = await getDocs(
          query(base, where("manager_id", "==", auth.currentUser.uid))
        );
        snap.docs.forEach((d) => {
          if (!or.teamIds.length || or.teamIds.includes(String(d.data().team_id))) {
            results.set(d.id, { ref: d.ref, data: d.data() });
          }
        });
      }

      return this.finishDocs([...results.values()]);
    }

    const constraints: QueryConstraint[] = [];
    for (const f of this.filters) {
      if (f.kind === "eq") constraints.push(where(f.field, "==", f.value));
      if (f.kind === "in") constraints.push(where(f.field, "in", f.values.slice(0, 30)));
      if (f.kind === "neq") constraints.push(where(f.field, "!=", f.value));
      if (f.kind === "is") {
        constraints.push(where(f.field, f.value === null ? "==" : "!=", f.value));
      }
    }

    const snap = await getDocs(query(base, ...constraints));
    return this.finishDocs(snap.docs.map((d) => ({ ref: d.ref, data: d.data() })));
  }

  private finishDocs(items: any[]) {
    let rows = items;

    for (const f of this.filters) {
      if (f.kind === "neq") rows = rows.filter((x) => x.data[f.field] !== f.value);
      if (f.kind === "is" && f.value === null) rows = rows.filter((x) => x.data[f.field] == null);
      if (f.kind === "is" && f.value !== null) rows = rows.filter((x) => x.data[f.field] !== f.value);
    }

    if (this.orderField) {
      const field = this.orderField;
      rows.sort((a, b) => {
        const av = a.data[field];
        const bv = b.data[field];
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * (this.orderAsc ? 1 : -1);
      });
    }
    if (this.maxRows) rows = rows.slice(0, this.maxRows);
    return rows;
  }

  private async addConversationRelations(rows: any[]) {
    return Promise.all(
      rows.map(async (row) => {
        const team = row.team_id ? await getDoc(doc(db, "teams", row.team_id)) : null;
        const round = row.round_id ? await getDoc(doc(db, "rounds", row.round_id)) : null;
        return {
          ...row,
          teams: team?.exists() ? { name: team.data().name } : null,
          rounds: round?.exists() ? { name: round.data().name } : null,
        };
      })
    );
  }
}

function client() {
  return {
    auth: {
      async getUser() {
        return { data: { user: userRecord(auth.currentUser) }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          return { data: { user: userRecord(result.user) }, error: null };
        } catch (error: any) {
          return { data: { user: null }, error: new Error(error.message || "Login failed.") };
        }
      },
	  
	  async signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });

    const result = await signInWithPopup(auth, provider);

    await ensureProfile(
      result.user,
      result.user.displayName || ""
    );

    return {
      data: { user: userRecord(result.user) },
      error: null,
    };
  } catch (error: any) {
    return {
      data: { user: null },
      error: new Error(error.message || "Google sign-in failed."),
    };
  }
},

      async linkGoogleAccount() {
        try {
          const currentUser = auth.currentUser;

          if (!currentUser) {
            return {
              data: { user: null },
              error: new Error(
                "You must be logged in before linking a Google account."
              ),
            };
          }

          const provider = new GoogleAuthProvider();

          provider.setCustomParameters({
            prompt: "select_account",
          });

          const result = await linkWithPopup(
            currentUser,
            provider
          );

          await ensureProfile(
            result.user,
            result.user.displayName || ""
          );

          return {
            data: { user: userRecord(result.user) },
            error: null,
          };
        } catch (error: any) {
          return {
            data: { user: null },
            error: new Error(
              error.message || "Could not link Google account."
            ),
          };
        }
      },
      async signUp({ email, password, options }: any) {
        try {
          const result = await createUserWithEmailAndPassword(auth, email, password);
          const name = options?.data?.name || "";
          await ensureProfile(result.user, name);
          try {
            await sendEmailVerification(result.user);
          } catch {
            // Email verification is optional for local development.
          }
          return { data: { user: userRecord(result.user), session: result.user }, error: null };
        } catch (error: any) {
          return { data: { user: null, session: null }, error: new Error(error.message || "Registration failed.") };
        }
      },
      async signOut() {
        await signOut(auth);
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          callback(user ? "SIGNED_IN" : "SIGNED_OUT", user ? { user: userRecord(user) } : null);
        });
        return { data: { subscription: { unsubscribe } } };
      },
    },
    from(table: string) {
      return new CompatQuery(table);
    },
    channel(name: string) {
      let unsubscribe: (() => void) | null = null;
      let callback: ((payload: any) => void) | null = null;
      return {
        on(_event: string, config: any, cb: (payload: any) => void) {
          callback = cb;
          const conversationId = String(config?.filter || "").replace("conversation_id=eq.", "");
          if (config?.table === "messages" && conversationId) {
            unsubscribe = onSnapshot(
              query(
                collection(db, "messages"),
                where("conversation_id", "==", conversationId)
              ),
              (snap) => {
                for (const change of snap.docChanges()) {
                  if (change.type === "added") {
                    const raw = change.doc.data();
                    callback?.({ new: { id: change.doc.id, ...serialise(raw) } });
                  }
                }
              }
            );
          }
          return this;
        },
        subscribe() {
          return this;
        },
        _unsubscribe() {
          unsubscribe?.();
        },
      };
    },
    removeChannel(channel: any) {
      channel?._unsubscribe?.();
    },
  };
}

export function createClient() {
  return client();
}
