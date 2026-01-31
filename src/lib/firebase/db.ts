import { getDatabase, ref, push, set, update, remove, onValue } from "firebase/database";
import { app } from "./firebase";
import { firebaseStorage, firebaseDb } from "./firebase";
import { getDownloadURL, ref as sref, uploadBytes, deleteObject } from "firebase/storage";
import { nanoid } from "nanoid"; 

import type { WorkOrderPhoto } from "./db";

export const rtdb = getDatabase(app);

export type Client = {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: number;
  updatedAt: number;
};

type RtdbRecord<T> = Record<string, T>;
type RtdbSnap<T> = RtdbRecord<T> | null | undefined;

function snapToList<T extends object>(snapVal: RtdbSnap<T>): Array<{ id: string } & T> {
  const obj = (snapVal ?? {}) as RtdbRecord<T>;
  return Object.entries(obj).map(([id, v]) => ({ id, ...(v as T) }));
}

const TENANT_ID = "default"; // depois a gente liga isso ao usuário/empresa

function clientsRef() {
  return ref(rtdb, `tenants/${TENANT_ID}/clients`);
}

export async function createClient(data: Omit<Client, "id" | "createdAt" | "updatedAt">) {
  const now = Date.now();
  const newRef = push(clientsRef());
  await set(newRef, { ...data, createdAt: now, updatedAt: now });
  return newRef.key!;
}

export async function updateClient(id: string, data: Partial<Omit<Client, "id" | "createdAt">>) {
  const now = Date.now();
  await update(ref(rtdb, `tenants/${TENANT_ID}/clients/${id}`), { ...data, updatedAt: now });
}

export async function deleteClient(id: string) {
  await remove(ref(rtdb, `tenants/${TENANT_ID}/clients/${id}`));
}

export function subscribeClients(cb: (items: Client[]) => void) {
  return onValue(clientsRef(), (snap) => {
    const list = snapToList<Omit<Client, "id">>(snap.val());
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    cb(list as Client[]);
  });
}

export type Vessel = {
  id: string;
  clientId: string;
  name: string;
  registration?: string;
  type?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

function vesselsRef() {
  return ref(rtdb, `tenants/${TENANT_ID}/vessels`);
}

export async function createVessel(data: Omit<Vessel, "id" | "createdAt" | "updatedAt">) {
  const now = Date.now();
  const newRef = push(vesselsRef());
  await set(newRef, { ...data, createdAt: now, updatedAt: now });
  return newRef.key!;
}

export async function updateVessel(id: string, data: Partial<Omit<Vessel, "id" | "createdAt">>) {
  const now = Date.now();
  await update(ref(rtdb, `tenants/${TENANT_ID}/vessels/${id}`), { ...data, updatedAt: now });
}

export async function deleteVessel(id: string) {
  await remove(ref(rtdb, `tenants/${TENANT_ID}/vessels/${id}`));
}

export function subscribeVessels(cb: (items: Vessel[]) => void) {
  return onValue(vesselsRef(), (snap) => {
    const list = snapToList<Omit<Vessel, "id">>(snap.val());
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    cb(list as Vessel[]);
  });
}

export type Equipment = {
  id: string;
  clientId: string;
  vesselId?: string;
  name: string;
  model?: string;
  serial?: string;
  systemType?: "hidraulico" | "eletronico" | "offshore";
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

function equipmentRef() {
  return ref(rtdb, `tenants/${TENANT_ID}/equipment`);
}

export async function createEquipment(
  data: Omit<Equipment, "id" | "createdAt" | "updatedAt">
) {
  const now = Date.now();
  const newRef = push(equipmentRef());
  await set(newRef, { ...data, createdAt: now, updatedAt: now });
  return newRef.key!;
}

export async function updateEquipment(
  id: string,
  data: Partial<Omit<Equipment, "id" | "createdAt">>
) {
  const now = Date.now();
  await update(ref(rtdb, `tenants/${TENANT_ID}/equipment/${id}`), {
    ...data,
    updatedAt: now,
  });
}

export async function deleteEquipment(id: string) {
  await remove(ref(rtdb, `tenants/${TENANT_ID}/equipment/${id}`));
}

export function subscribeEquipment(cb: (items: Equipment[]) => void) {
  return onValue(equipmentRef(), (snap) => {
    const list = snapToList<Omit<Equipment, "id">>(snap.val());
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    cb(list as Equipment[]);
  });
}


export type WorkOrderStatus =
  | "EM_ANALISE"
  | "AGUARDANDO_PECA"
  | "AGUARDANDO_APROVACAO_ORCAMENTO"
  | "EM_EXECUCAO"
  | "CONCLUIDO"
  | "CANCELADO";

export type WorkOrderPriority = "baixa" | "media" | "alta" | "critica";

export type WorkOrder = {
  id: string;
  code: string; // ex: OS-2026-000123 (por enquanto simples)
  clientId: string;
  vesselId?: string;
  equipmentId?: string;
  assigneeUid?: string; // responsável (uid do auth)
  reportedDefect: string;
  serviceReport?: string;
  photos?: Record<string, WorkOrderPhoto>;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;

  createdAt: number;
  updatedAt: number;
  statusUpdatedAt: number;
  createdBy?: string; // uid (opcional agora)
};

export type WorkOrderStatusEvent = {
  id: string;
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  note?: string;
  changedAt: number;
  changedBy?: string; // uid (opcional agora)
};

export type WorkOrderPhoto = {
  id: string;
  url: string;
  path: string;      // caminho no Storage
  name: string;
  createdAt: number;
  createdBy?: string | null;
};


function workOrdersRef() {
  return ref(rtdb, `tenants/${TENANT_ID}/workOrders`);
}

function workOrderRef(id: string) {
  return ref(rtdb, `tenants/${TENANT_ID}/workOrders/${id}`);
}

function woHistoryRef(woId: string) {
  return ref(rtdb, `tenants/${TENANT_ID}/workOrdersStatusHistory/${woId}`);
}

export async function createWorkOrder(
  data: Omit<WorkOrder, "id" | "code" | "createdAt" | "updatedAt" | "statusUpdatedAt">
) {
  const now = Date.now();
  const newRef = push(workOrdersRef());
  const id = newRef.key!;

  await set(newRef, {
    ...data,
    code: "PENDING",
    createdAt: now,
    updatedAt: now,
    statusUpdatedAt: now,
  });

  return id;
}

export async function updateWorkOrder(
  id: string,
  data: Partial<Omit<WorkOrder, "id" | "code" | "createdAt">>
) {
  const now = Date.now();
  await update(workOrderRef(id), { ...data, updatedAt: now });
}

export async function deleteWorkOrder(id: string) {
  await remove(workOrderRef(id));
  await remove(woHistoryRef(id)); // limpa histórico junto
}

export function subscribeWorkOrders(cb: (items: WorkOrder[]) => void) {
  return onValue(workOrdersRef(), (snap) => {
    const list = snapToList<Omit<WorkOrder, "id">>(snap.val());
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    cb(list as WorkOrder[]);
  });
}

export function subscribeWorkOrderById(id: string, cb: (item: WorkOrder | null) => void) {
  return onValue(workOrderRef(id), (snap) => {
    const v = snap.val();
    cb(v ? ({ id, ...v } as WorkOrder) : null);
  });
}

export function subscribeWorkOrderHistory(
  woId: string,
  cb: (events: WorkOrderStatusEvent[]) => void
) {
  return onValue(woHistoryRef(woId), (snap) => {
    const list = snapToList<Omit<WorkOrderStatusEvent, "id">>(snap.val());
    list.sort((a, b) => (b.changedAt || 0) - (a.changedAt || 0));
    cb(list as WorkOrderStatusEvent[]);
  });
}

export async function changeWorkOrderStatus(
  woId: string,
  _from: WorkOrderStatus,
  to: WorkOrderStatus,
  note?: string
) {
  const now = Date.now();
  await update(workOrderRef(woId), {
    status: to,
    statusNote: note || "",
    updatedAt: now,
    statusUpdatedAt: now,
  });
}
export async function uploadWorkOrderPhoto(woId: string, file: File, createdBy?: string | null) {
  // id estável pra RTDB + Storage
  const photoId = nanoid();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";

  const path = `tenants/${TENANT_ID}/workOrders/${woId}/${photoId}.${ext}`;
  const storageRef = sref(firebaseStorage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "public,max-age=31536000",
  });

  const url = await getDownloadURL(storageRef);

  const photo: WorkOrderPhoto = {
    id: photoId,
    url,
    path,
    name: file.name,
    createdAt: Date.now(),
    createdBy: createdBy ?? null,
  };

  // salva metadados no RTDB
  await set(ref(firebaseDb, `tenants/${TENANT_ID}/workOrders/${woId}/photos/${photoId}`), photo);

  return photo;
}

export async function deleteWorkOrderPhoto(woId: string, photo: WorkOrderPhoto) {
  // remove do Storage
  await deleteObject(sref(firebaseStorage, photo.path));
  // remove do RTDB
  await remove(ref(firebaseDb, `tenants/${TENANT_ID}/workOrders/${woId}/photos/${photo.id}`));
}