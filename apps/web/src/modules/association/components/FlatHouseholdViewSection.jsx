import { useQuery } from '@tanstack/react-query';
import { api, mediaUrl } from '../../inventory/api/client.js';

function Section({ title, children }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h4>
      {children}
    </div>
  );
}

function EmptyLine() {
  return <p className="text-muted">None recorded.</p>;
}

/**
 * Read-only household snapshot for the flat View dialog.
 */
export function FlatHouseholdViewSection({ flat }) {
  const slots = useQuery({
    queryKey: ['parking-slots', flat.id, 'view'],
    queryFn: () => api.association.parkingSlots.list({ flatId: flat.id }),
  });
  const vehicles = useQuery({
    queryKey: ['flat-vehicles', flat.id, 'view'],
    queryFn: () => api.association.household.vehicles(flat.id, false),
  });
  const pets = useQuery({
    queryKey: ['flat-pets', flat.id, 'view'],
    queryFn: () => api.association.household.pets(flat.id, false),
  });
  const contacts = useQuery({
    queryKey: ['flat-contacts', flat.id, 'view'],
    queryFn: () => api.association.household.emergencyContacts(flat.id, false),
  });
  const devices = useQuery({
    queryKey: ['flat-devices', flat.id, 'view'],
    queryFn: () => api.association.household.accessDevices(flat.id, false),
  });

  const loading =
    slots.isLoading ||
    vehicles.isLoading ||
    pets.isLoading ||
    contacts.isLoading ||
    devices.isLoading;

  if (loading) {
    return <p className="mt-3 text-muted">Loading household…</p>;
  }

  return (
    <div>
      <Section title="Parking allotments">
        {(slots.data || []).length ? (
          <ul className="space-y-1">
            {(slots.data || []).map((s) => {
              const letter = s.letterFileUrl
                ? { label: 'On file', url: s.letterFileUrl, name: s.letterOriginalName }
                : flat.parkingLetterUrl
                  ? {
                      label: 'On file (flat)',
                      url: flat.parkingLetterUrl,
                      name: flat.parkingLetterOriginalName,
                    }
                  : { label: 'Missing', url: null };
              return (
                <li key={s.id}>
                  {s.label} · {s.slotType} · Letter:{' '}
                  {letter.url ? (
                    <a
                      className="font-medium text-brand underline"
                      href={mediaUrl(letter.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {letter.name || letter.label}
                    </a>
                  ) : (
                    <span className="text-muted">{letter.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyLine />
        )}
        <p className="mt-1 text-xs text-muted">
          Entitled slot count on flat: {flat.parkingSlots ?? 0}
          {flat.parkingLetterUrl ? (
            <>
              {' · '}
              <a
                className="text-brand underline"
                href={mediaUrl(flat.parkingLetterUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Flat parking letter
              </a>
            </>
          ) : null}
        </p>
      </Section>

      <Section title="Vehicles">
        {(vehicles.data || []).length ? (
          <ul className="space-y-2">
            {(vehicles.data || []).map((v) => (
              <li key={v.id}>
                <span className="font-medium">{v.registrationNo}</span>
                {' · '}
                {v.vehicleType}
                {v.make || v.model
                  ? ` · ${[v.make, v.model].filter(Boolean).join(' ')}`
                  : ''}
                {v.color ? ` · ${v.color}` : ''}
                {v.parkingSlot ? ` · slot ${v.parkingSlot.label}` : ''}
                {v.stickerNo || v.rfidTag
                  ? ` · tag ${v.stickerNo || v.rfidTag}`
                  : ''}
                {v.rcFileUrl ? (
                  <>
                    {' · '}
                    <a
                      className="text-brand underline"
                      href={mediaUrl(v.rcFileUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      RC
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyLine />
        )}
      </Section>

      <Section title="Pets">
        {(pets.data || []).length ? (
          <ul className="space-y-1">
            {(pets.data || []).map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.name}</span> · {p.species}
                {p.breed ? ` · ${p.breed}` : ''}
                {p.rabiesValidTill
                  ? ` · rabies till ${String(p.rabiesValidTill).slice(0, 10)}`
                  : ''}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyLine />
        )}
      </Section>

      <Section title="Emergency contacts">
        {(contacts.data || []).length ? (
          <ul className="space-y-1">
            {(contacts.data || []).map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span> · {c.phone}
                {c.relationship ? ` · ${c.relationship}` : ''}
                {c.isPrimary ? ' · primary' : ''}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyLine />
        )}
      </Section>

      <Section title="Access devices">
        {(devices.data || []).length ? (
          <ul className="space-y-1">
            {(devices.data || []).map((d) => (
              <li key={d.id}>
                {d.deviceType} · {d.identifier} · {d.status}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyLine />
        )}
      </Section>
    </div>
  );
}
