import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mediaUrl, getAuthUser, getDevRole } from '../../inventory/api/client.js';
import { Can } from '../../inventory/auth/Can.jsx';
import { can } from '../../inventory/auth/permissions.js';
import { IconButton } from '../../inventory/components/IconButton.jsx';
import { RowActions } from '../../inventory/components/RowActions.jsx';
import { TrashIcon, PencilSquareIcon, ArrowUpTrayIcon, ArrowUturnLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const TABS = [
  { id: 'parking', label: 'Parking' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'pets', label: 'Pets' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'access', label: 'Access' },
  { id: 'pending', label: 'Pending' },
];

export function FlatHouseholdPanel({ flat, onClose, embedded = false }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('parking');
  const [err, setErr] = useState('');
  const [slotForm, setSlotForm] = useState({ label: '', slotType: 'COVERED' });
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: 'FOUR_WHEELER',
    registrationNo: '',
    make: '',
    model: '',
    color: '',
    stickerNo: '',
    rfidTag: '',
    parkingSlotId: '',
  });
  const [petForm, setPetForm] = useState({
    species: 'Dog',
    name: '',
    breed: '',
    rabiesValidTill: '',
    vaccinationNotes: '',
  });
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: true,
  });
  const [deviceForm, setDeviceForm] = useState({
    deviceType: 'FOB',
    identifier: '',
    notes: '',
  });
  const rcRef = useRef(null);
  const [rcVehicleId, setRcVehicleId] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editingPetId, setEditingPetId] = useState(null);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editingDeviceId, setEditingDeviceId] = useState(null);

  const canEdit = can('flatOwners', 'createEdit');
  const role = getAuthUser()?.role || getDevRole();
  const isStaff = role === 'SUPERADMIN' || role === 'SECRETARY';

  const blankVehicle = {
    vehicleType: 'FOUR_WHEELER',
    registrationNo: '',
    make: '',
    model: '',
    color: '',
    stickerNo: '',
    rfidTag: '',
    parkingSlotId: '',
  };
  const blankPet = {
    species: 'Dog',
    name: '',
    breed: '',
    rabiesValidTill: '',
    vaccinationNotes: '',
  };
  const blankContact = {
    name: '',
    phone: '',
    relationship: '',
    isPrimary: true,
  };
  const blankDevice = { deviceType: 'FOB', identifier: '', notes: '' };

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['parking-slots'] });
    qc.invalidateQueries({ queryKey: ['flat-vehicles', flat.id] });
    qc.invalidateQueries({ queryKey: ['flat-pets', flat.id] });
    qc.invalidateQueries({ queryKey: ['flat-contacts', flat.id] });
    qc.invalidateQueries({ queryKey: ['flat-devices', flat.id] });
    qc.invalidateQueries({ queryKey: ['flat-pending', flat.id] });
  }

  const slots = useQuery({
    queryKey: ['parking-slots', flat.id],
    queryFn: () => api.association.parkingSlots.list({ flatId: flat.id }),
  });
  const vehicles = useQuery({
    queryKey: ['flat-vehicles', flat.id],
    queryFn: () => api.association.household.vehicles(flat.id, true),
  });
  const pets = useQuery({
    queryKey: ['flat-pets', flat.id],
    queryFn: () => api.association.household.pets(flat.id, true),
  });
  const contacts = useQuery({
    queryKey: ['flat-contacts', flat.id],
    queryFn: () => api.association.household.emergencyContacts(flat.id, true),
  });
  const devices = useQuery({
    queryKey: ['flat-devices', flat.id],
    queryFn: () => api.association.household.accessDevices(flat.id, true),
  });
  const pending = useQuery({
    queryKey: ['flat-pending', flat.id],
    queryFn: () => api.association.household.pending(flat.id),
    enabled: isStaff && tab === 'pending',
  });

  const addSlot = useMutation({
    mutationFn: () =>
      api.association.parkingSlots.create({
        ...slotForm,
        flatId: flat.id,
      }),
    onSuccess: () => {
      setSlotForm({ label: '', slotType: 'COVERED' });
      invalidate();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const addVehicle = useMutation({
    mutationFn: () => {
      const body = {
        ...vehicleForm,
        parkingSlotId: vehicleForm.parkingSlotId || null,
      };
      if (editingVehicleId) {
        return api.association.household.updateVehicle(editingVehicleId, body);
      }
      return api.association.household.createVehicle(flat.id, body);
    },
    onSuccess: () => {
      setVehicleForm(blankVehicle);
      setEditingVehicleId(null);
      invalidate();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const addPet = useMutation({
    mutationFn: () => {
      const body = {
        ...petForm,
        rabiesValidTill: petForm.rabiesValidTill || null,
      };
      if (editingPetId) {
        return api.association.household.updatePet(editingPetId, body);
      }
      return api.association.household.createPet(flat.id, body);
    },
    onSuccess: () => {
      setPetForm(blankPet);
      setEditingPetId(null);
      invalidate();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const addContact = useMutation({
    mutationFn: () => {
      if (editingContactId) {
        return api.association.household.updateEmergencyContact(
          editingContactId,
          contactForm
        );
      }
      return api.association.household.createEmergencyContact(
        flat.id,
        contactForm
      );
    },
    onSuccess: () => {
      setContactForm(blankContact);
      setEditingContactId(null);
      invalidate();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const addDevice = useMutation({
    mutationFn: () => {
      if (editingDeviceId) {
        return api.association.household.updateAccessDevice(
          editingDeviceId,
          deviceForm
        );
      }
      return api.association.household.createAccessDevice(flat.id, deviceForm);
    },
    onSuccess: () => {
      setDeviceForm(blankDevice);
      setEditingDeviceId(null);
      invalidate();
      setErr('');
    },
    onError: (e) => setErr(e.message),
  });

  const flatLabel = `T${flat.tower}-${flat.flatNumber}`;
  const allottedCount = (slots.data || []).length;
  const overEntitlement =
    flat.parkingSlots != null && allottedCount > Number(flat.parkingSlots);

  return (
    <div
      className={
        embedded
          ? 'space-y-3'
          : 'panel mb-6 border border-brand/30'
      }
    >
      {embedded ? (
        <p className="text-sm text-muted">
          Parking, vehicles, pets, emergency contacts, access devices
          {flat.parkingSlots
            ? ` · entitled slots: ${flat.parkingSlots}`
            : ''}
        </p>
      ) : (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Household — {flatLabel}
            </h2>
            <p className="text-sm text-muted">
              Parking, vehicles, pets, emergency contacts, access devices
              {flat.parkingSlots
                ? ` · entitled slots: ${flat.parkingSlots}`
                : ''}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      )}

      {err ? <p className="mb-3 text-sm text-danger">{err}</p> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.filter((t) => t.id !== 'pending' || isStaff).map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'parking' ? (
        <div>
          {overEntitlement ? (
            <p className="mb-3 text-sm text-warn">
              Allotted slots ({allottedCount}) exceed entitled count (
              {flat.parkingSlots}). Entitlement is advisory — adjust flat
              parking slots or remove allotments if needed.
            </p>
          ) : null}
          {allottedCount > 0 &&
          !(slots.data || []).every(
            (s) => s.letterFileUrl || flat.parkingLetterUrl
          ) ? (
            <p className="mb-3 text-sm text-warn">
              Parking allotment letter missing for one or more bays (optional,
              but attach slot letter or a flat-level letter when available).
            </p>
          ) : null}
          <Can resource="flatOwners" action="createEdit">
            {isStaff ? (
              <form
                className="mb-4 grid gap-2 md:grid-cols-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  addSlot.mutate();
                }}
              >
                <input
                  className="input"
                  placeholder="Slot label e.g. B1-12"
                  value={slotForm.label}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, label: e.target.value })
                  }
                  required
                />
                <select
                  className="input"
                  value={slotForm.slotType}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, slotType: e.target.value })
                  }
                >
                  <option value="COVERED">Covered</option>
                  <option value="OPEN">Open</option>
                  <option value="STILT">Stilt</option>
                  <option value="OTHER">Other</option>
                </select>
                <button type="submit" className="btn-primary md:col-span-2">
                  Allot new slot to this flat
                </button>
              </form>
            ) : null}
          </Can>

          <div className="mb-4 rounded border border-line/70 p-3 text-sm">
            <p className="mb-1 font-medium text-ink">
              Flat-level parking letter (fallback)
            </p>
            <p className="mb-2 text-xs text-muted">
              Used when a bay has no slot letter. Optional.
            </p>
            {flat.parkingLetterUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  className="font-medium text-brand underline"
                  href={mediaUrl(flat.parkingLetterUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {flat.parkingLetterOriginalName || 'Open letter'}
                </a>
                {isStaff ? (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() =>
                      api.association.flats
                        .clearParkingLetter(flat.id)
                        .then(() => {
                          invalidate();
                          qc.invalidateQueries({ queryKey: ['flats'] });
                        })
                        .catch((e) => setErr(e.message))
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ) : isStaff ? (
              <label className="inline-flex cursor-pointer items-center gap-2 text-brand">
                <ArrowUpTrayIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Upload flat letter</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    api.association.flats
                      .uploadParkingLetter(flat.id, file)
                      .then(() => {
                        invalidate();
                        qc.invalidateQueries({ queryKey: ['flats'] });
                        setErr('');
                      })
                      .catch((err) => setErr(err.message));
                  }}
                />
              </label>
            ) : (
              <p className="text-muted">No flat letter on file.</p>
            )}
          </div>

          <ul className="space-y-2 text-sm">
            {(slots.data || []).map((s) => {
              const letterOnSlot = Boolean(s.letterFileUrl);
              const letterViaFlat =
                !letterOnSlot && Boolean(flat.parkingLetterUrl);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2"
                >
                  <div>
                    <p>
                      <strong>{s.label}</strong> · {s.slotType}
                      {!s.active ? ' · inactive' : ''}
                    </p>
                    <p className="text-xs text-muted">
                      Letter:{' '}
                      {letterOnSlot ? (
                        <a
                          className="font-medium text-brand underline"
                          href={mediaUrl(s.letterFileUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.letterOriginalName || 'On file'}
                        </a>
                      ) : letterViaFlat ? (
                        <span className="text-ink">On file (flat fallback)</span>
                      ) : (
                        <span className="text-warn">Missing (optional)</span>
                      )}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-0.5">
                    {isStaff ? (
                      <>
                        <label className="btn-ghost inline-flex cursor-pointer items-center gap-1 px-2 py-1 text-xs">
                          <ArrowUpTrayIcon className="h-4 w-4" />
                          Letter
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (!file) return;
                              api.association.parkingSlots
                                .uploadLetter(s.id, file)
                                .then(() => {
                                  invalidate();
                                  setErr('');
                                })
                                .catch((err) => setErr(err.message));
                            }}
                          />
                        </label>
                        {letterOnSlot ? (
                          <IconButton
                            label="Clear slot letter"
                            onClick={() =>
                              api.association.parkingSlots
                                .clearLetter(s.id)
                                .then(invalidate)
                                .catch((e) => setErr(e.message))
                            }
                          >
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                          </IconButton>
                        ) : null}
                        <IconButton
                          label="Remove allotment"
                          tone="danger"
                          onClick={() =>
                            api.association.parkingSlots
                              .update(s.id, { flatId: null })
                              .then(invalidate)
                              .catch((e) => setErr(e.message))
                          }
                        >
                          <TrashIcon className="h-4 w-4" />
                        </IconButton>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {!slots.isLoading && !(slots.data || []).length ? (
              <li className="text-muted">No slots allotted yet.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {tab === 'vehicles' ? (
        <div>
          {canEdit ? (
            <form
              className="mb-4 grid gap-2 md:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                addVehicle.mutate();
              }}
            >
              <select
                className="input"
                value={vehicleForm.vehicleType}
                onChange={(e) =>
                  setVehicleForm({
                    ...vehicleForm,
                    vehicleType: e.target.value,
                  })
                }
              >
                <option value="FOUR_WHEELER">4-wheeler</option>
                <option value="TWO_WHEELER">2-wheeler</option>
                <option value="EV">EV</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                className="input"
                placeholder="Registration no."
                value={vehicleForm.registrationNo}
                onChange={(e) =>
                  setVehicleForm({
                    ...vehicleForm,
                    registrationNo: e.target.value,
                  })
                }
                required
              />
              <input
                className="input"
                placeholder="Make"
                value={vehicleForm.make}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, make: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Model"
                value={vehicleForm.model}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, model: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Colour"
                value={vehicleForm.color}
                onChange={(e) =>
                  setVehicleForm({ ...vehicleForm, color: e.target.value })
                }
              />
              <input
                className="input"
                placeholder="Sticker / RFID"
                value={vehicleForm.stickerNo}
                onChange={(e) =>
                  setVehicleForm({
                    ...vehicleForm,
                    stickerNo: e.target.value,
                    rfidTag: e.target.value,
                  })
                }
              />
              <select
                className="input"
                value={vehicleForm.parkingSlotId}
                onChange={(e) =>
                  setVehicleForm({
                    ...vehicleForm,
                    parkingSlotId: e.target.value,
                  })
                }
              >
                <option value="">Parking slot (optional)</option>
                {(slots.data || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary md:col-span-2">
                {editingVehicleId
                  ? 'Save vehicle changes'
                  : isStaff
                    ? 'Add vehicle'
                    : 'Submit vehicle for approval'}
              </button>
              {editingVehicleId ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditingVehicleId(null);
                    setVehicleForm(blankVehicle);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
          ) : null}
          <ul className="space-y-3 text-sm">
            {(vehicles.data || []).map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 py-2"
              >
                <div>
                  <strong>{v.registrationNo}</strong> · {v.vehicleType}
                  {v.make || v.model
                    ? ` · ${[v.make, v.model].filter(Boolean).join(' ')}`
                    : ''}
                  {v.parkingSlot ? ` · slot ${v.parkingSlot.label}` : ''}
                  <span className="ml-2 text-xs text-muted">
                    {v.approvalStatus}
                  </span>
                  {v.rcFileUrl ? (
                    <a
                      className="ml-2 text-brand underline"
                      href={mediaUrl(v.rcFileUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      RC
                    </a>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {isStaff && canEdit ? (
                    <>
                      <IconButton
                        label="Edit vehicle"
                        tone="brand"
                        onClick={() => {
                          setEditingVehicleId(v.id);
                          setVehicleForm({
                            vehicleType: v.vehicleType,
                            registrationNo: v.registrationNo,
                            make: v.make || '',
                            model: v.model || '',
                            color: v.color || '',
                            stickerNo: v.stickerNo || '',
                            rfidTag: v.rfidTag || '',
                            parkingSlotId: v.parkingSlotId || '',
                          });
                        }}
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </IconButton>
                      <IconButton
                        label="Upload RC"
                        onClick={() => {
                          setRcVehicleId(v.id);
                          rcRef.current?.click();
                        }}
                      >
                        <ArrowUpTrayIcon className="h-5 w-5" />
                      </IconButton>
                      <RowActions
                        resource="flatOwners"
                        entityLabel={v.registrationNo}
                        onDelete={() =>
                          api.association.household
                            .removeVehicle(v.id)
                            .then(invalidate)
                        }
                      />
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <input
            ref={rcRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file || !rcVehicleId) return;
              api.association.household
                .uploadVehicleRc(rcVehicleId, file)
                .then(() => {
                  invalidate();
                  setRcVehicleId(null);
                })
                .catch((ex) => setErr(ex.message));
            }}
          />
        </div>
      ) : null}

      {tab === 'pets' ? (
        <div>
          {canEdit ? (
            <form
              className="mb-4 grid gap-2 md:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                addPet.mutate();
              }}
            >
              <input
                className="input"
                placeholder="Species"
                value={petForm.species}
                onChange={(e) =>
                  setPetForm({ ...petForm, species: e.target.value })
                }
                required
              />
              <input
                className="input"
                placeholder="Name"
                value={petForm.name}
                onChange={(e) =>
                  setPetForm({ ...petForm, name: e.target.value })
                }
                required
              />
              <input
                className="input"
                placeholder="Breed"
                value={petForm.breed}
                onChange={(e) =>
                  setPetForm({ ...petForm, breed: e.target.value })
                }
              />
              <label>
                <span className="label">Rabies valid till</span>
                <input
                  type="date"
                  className="input"
                  value={petForm.rabiesValidTill}
                  onChange={(e) =>
                    setPetForm({ ...petForm, rabiesValidTill: e.target.value })
                  }
                />
              </label>
              <input
                className="input md:col-span-2"
                placeholder="Vaccination notes"
                value={petForm.vaccinationNotes}
                onChange={(e) =>
                  setPetForm({ ...petForm, vaccinationNotes: e.target.value })
                }
              />
              <button type="submit" className="btn-primary">
                {editingPetId
                  ? 'Save pet changes'
                  : isStaff
                    ? 'Add pet'
                    : 'Submit pet for approval'}
              </button>
              {editingPetId ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditingPetId(null);
                    setPetForm(blankPet);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
          ) : null}
          <ul className="space-y-2 text-sm">
            {(pets.data || []).map((p) => (
              <li
                key={p.id}
                className="flex justify-between border-b border-border/50 py-2"
              >
                <span>
                  <strong>{p.name}</strong> · {p.species}
                  {p.breed ? ` · ${p.breed}` : ''}
                  {p.rabiesValidTill
                    ? ` · rabies till ${String(p.rabiesValidTill).slice(0, 10)}`
                    : ''}
                  <span className="ml-2 text-xs text-muted">
                    {p.approvalStatus}
                  </span>
                </span>
                {isStaff ? (
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Edit pet"
                      tone="brand"
                      onClick={() => {
                        setEditingPetId(p.id);
                        setPetForm({
                          species: p.species,
                          name: p.name,
                          breed: p.breed || '',
                          rabiesValidTill: p.rabiesValidTill
                            ? String(p.rabiesValidTill).slice(0, 10)
                            : '',
                          vaccinationNotes: p.vaccinationNotes || '',
                        });
                      }}
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </IconButton>
                    <RowActions
                      resource="flatOwners"
                      entityLabel={p.name}
                      onDelete={() =>
                        api.association.household
                          .removePet(p.id)
                          .then(invalidate)
                      }
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'emergency' ? (
        <div>
          {canEdit ? (
            <form
              className="mb-4 grid gap-2 md:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                addContact.mutate();
              }}
            >
              <input
                className="input"
                placeholder="Name"
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm({ ...contactForm, name: e.target.value })
                }
                required
              />
              <input
                className="input"
                placeholder="Phone"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm({ ...contactForm, phone: e.target.value })
                }
                required
              />
              <input
                className="input"
                placeholder="Relationship"
                value={contactForm.relationship}
                onChange={(e) =>
                  setContactForm({
                    ...contactForm,
                    relationship: e.target.value,
                  })
                }
              />
              <button type="submit" className="btn-primary">
                {editingContactId ? 'Save contact changes' : 'Add contact'}
              </button>
              {editingContactId ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditingContactId(null);
                    setContactForm(blankContact);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
          ) : null}
          <ul className="space-y-2 text-sm">
            {(contacts.data || []).map((c) => (
              <li
                key={c.id}
                className="flex justify-between border-b border-border/50 py-2"
              >
                <span>
                  <strong>{c.name}</strong> · {c.phone}
                  {c.relationship ? ` · ${c.relationship}` : ''}
                  {c.isPrimary ? ' · primary' : ''}
                  <span className="ml-2 text-xs text-muted">
                    {c.approvalStatus}
                  </span>
                </span>
                {isStaff ? (
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Edit contact"
                      tone="brand"
                      onClick={() => {
                        setEditingContactId(c.id);
                        setContactForm({
                          name: c.name,
                          phone: c.phone,
                          relationship: c.relationship || '',
                          isPrimary: Boolean(c.isPrimary),
                        });
                      }}
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </IconButton>
                    <RowActions
                      resource="flatOwners"
                      entityLabel={c.name}
                      onDelete={() =>
                        api.association.household
                          .removeEmergencyContact(c.id)
                          .then(invalidate)
                      }
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'access' ? (
        <div>
          {canEdit ? (
            <form
              className="mb-4 grid gap-2 md:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                addDevice.mutate();
              }}
            >
              <select
                className="input"
                value={deviceForm.deviceType}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, deviceType: e.target.value })
                }
              >
                <option value="FOB">Fob</option>
                <option value="RFID_TAG">RFID tag</option>
                <option value="REMOTE">Remote</option>
                <option value="STICKER">Sticker</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                className="input"
                placeholder="Identifier / serial"
                value={deviceForm.identifier}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, identifier: e.target.value })
                }
                required
              />
              <input
                className="input"
                placeholder="Notes"
                value={deviceForm.notes}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, notes: e.target.value })
                }
              />
              <button type="submit" className="btn-primary">
                {editingDeviceId ? 'Save device changes' : 'Issue device'}
              </button>
              {editingDeviceId ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditingDeviceId(null);
                    setDeviceForm(blankDevice);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
          ) : null}
          <ul className="space-y-2 text-sm">
            {(devices.data || []).map((d) => (
              <li
                key={d.id}
                className="flex justify-between border-b border-border/50 py-2"
              >
                <span>
                  <strong>{d.deviceType}</strong> · {d.identifier} · {d.status}
                  <span className="ml-2 text-xs text-muted">
                    {d.approvalStatus}
                  </span>
                </span>
                <div className="flex gap-1">
                  {isStaff ? (
                    <IconButton
                      label="Edit device"
                      tone="brand"
                      onClick={() => {
                        setEditingDeviceId(d.id);
                        setDeviceForm({
                          deviceType: d.deviceType,
                          identifier: d.identifier,
                          notes: d.notes || '',
                        });
                      }}
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </IconButton>
                  ) : null}
                  {isStaff && d.status === 'ACTIVE' ? (
                    <IconButton
                      label="Mark returned"
                      onClick={() =>
                        api.association.household
                          .updateAccessDevice(d.id, { status: 'RETURNED' })
                          .then(invalidate)
                      }
                    >
                      <ArrowUturnLeftIcon className="h-5 w-5" />
                    </IconButton>
                  ) : null}
                  {isStaff ? (
                    <RowActions
                      resource="flatOwners"
                      entityLabel={d.identifier}
                      onDelete={() =>
                        api.association.household
                          .removeAccessDevice(d.id)
                          .then(invalidate)
                      }
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'pending' && isStaff ? (
        <div className="space-y-4 text-sm">
          {[
            {
              key: 'vehicles',
              label: 'Vehicles',
              rows: pending.data?.vehicles || [],
              approve: api.association.household.approveVehicle,
              reject: api.association.household.rejectVehicle,
              name: (r) => r.registrationNo,
            },
            {
              key: 'pets',
              label: 'Pets',
              rows: pending.data?.pets || [],
              approve: api.association.household.approvePet,
              reject: api.association.household.rejectPet,
              name: (r) => r.name,
            },
            {
              key: 'contacts',
              label: 'Emergency',
              rows: pending.data?.contacts || [],
              approve: api.association.household.approveEmergencyContact,
              reject: api.association.household.rejectEmergencyContact,
              name: (r) => r.name,
            },
            {
              key: 'devices',
              label: 'Access',
              rows: pending.data?.devices || [],
              approve: api.association.household.approveAccessDevice,
              reject: api.association.household.rejectAccessDevice,
              name: (r) => r.identifier,
            },
          ].map((section) => (
            <div key={section.key}>
              <h3 className="mb-2 font-medium">{section.label}</h3>
              {!section.rows.length ? (
                <p className="text-muted">None pending.</p>
              ) : (
                <ul className="space-y-2">
                  {section.rows.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2"
                    >
                      <span>{section.name(r)}</span>
                      <div className="flex gap-1">
                        <IconButton
                          label="Approve"
                          tone="brand"
                          onClick={() =>
                            section.approve(r.id).then(invalidate)
                          }
                        >
                          <CheckIcon className="h-5 w-5" />
                        </IconButton>
                        <IconButton
                          label="Reject"
                          tone="danger"
                          onClick={() => {
                            const reason = prompt('Rejection reason') || '';
                            section.reject(r.id, reason).then(invalidate);
                          }}
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </IconButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
