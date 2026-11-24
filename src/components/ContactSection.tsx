"use client";

import {
  CONTACT_MAX_LENGTH,
  ContactForm,
  contactFieldLabel,
} from "@/components/contact/ContactForm";
import { CONTACT_CHANNELS } from "@/content/profile";

// Diekspor ulang: batas panjang & label field kini tinggal bersama form-nya
// (ContactForm), tetapi pemakai lama mengimpornya dari berkas ini.
export { CONTACT_MAX_LENGTH, contactFieldLabel };

export const ContactSection = () => {
  // Kontak diambil dari env supaya nilainya bisa diisi tanpa menyentuh kode.
  // Telepon SENGAJA disembunyikan bila kosong: sebelumnya nilainya masih
  // placeholder "+62" dengan tautan ke https://wa.me/62 — recruiter yang
  // mengkliknya mendarat di halaman WhatsApp yang tidak valid. Lebih baik
  // barisnya absen daripada menawarkan kontak yang tidak bisa dihubungi.
  const contactInfo = CONTACT_CHANNELS;

  return (
    <section
      className="w-full bg-zinc-950 pt-32 pb-32"
      id="contact"
      aria-labelledby="contact-heading"
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-16">
          {/* Section Header */}
          <div className="reveal-on-scroll border-thin flex flex-col gap-4 border-b pb-8">
            <div className="eyebrow mb-4">[ INQUIRIES & COLLABORATION ]</div>
            <h2 id="contact-heading" className="section-title">
              Let&apos;s build <br /> something bold.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8">
            {/* Contact Info */}
            <div className="reveal-on-scroll flex flex-col gap-12 lg:col-span-4">
              <p className="body-copy">
                Whether you need an interactive frontend, a scalable backend, or
                a complete digital overhaul, I am ready to discuss your next
                project.
              </p>

              <div className="flex w-full max-w-sm flex-col gap-6">
                {contactInfo.map((item, idx) => {
                  const body = (
                    <>
                      <span className="eyebrow mb-2">
                        (0{idx + 1}) {item.title}
                      </span>
                      <span className="text-xl font-medium tracking-tight underline-offset-4 group-hover:underline">
                        {item.value}
                      </span>
                    </>
                  );

                  return item.href ? (
                    <a
                      key={item.title}
                      href={item.href}
                      className="group border-thin flex flex-col border-b pb-4 transition-opacity hover:opacity-70"
                    >
                      {body}
                    </a>
                  ) : (
                    <div
                      key={item.title}
                      className="group border-thin flex flex-col border-b pb-4"
                    >
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contact Form */}
            <div className="reveal-on-scroll lg:col-span-8 lg:pl-12">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
