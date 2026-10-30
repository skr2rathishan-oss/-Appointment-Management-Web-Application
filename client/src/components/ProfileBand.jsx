import { doctorName, initials } from '../utils/format';

// The dark header band on the public doctor page and on the doctor's own profile
export default function ProfileBand({ doctor }) {
  return (
    <section className="profile-band">
      <span className="monogram monogram-lg" aria-hidden="true">{initials(doctor.firstName, doctor.lastName)}</span>
      <div>
        <h1>{doctorName(doctor)}</h1>
        <p className="profile-specialty">{doctor.specialization}</p>
        <div className="profile-contact">
          <a href={`mailto:${doctor.email}`}>{doctor.email}</a>
          {doctor.phone && <a href={`tel:${doctor.phone.replace(/\s+/g, '')}`}>{doctor.phone}</a>}
        </div>
      </div>
    </section>
  );
}
