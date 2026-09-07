"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import publicClient from "@/lib/axios/public";
import { motion, useInView } from "framer-motion";
import { MoveRight } from "lucide-react";
import { useRef, useState } from "react";

export const ContactSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: (formData.get("name") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim(),
      subject: (formData.get("subject") || "").toString().trim(),
      message: (formData.get("message") || "").toString().trim(),
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.subject ||
      !payload.message
    ) {
      toast({
        title: "Required fields missing",
        description: "Please fill all required fields.",
        variant: "warning",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await publicClient.post("/contact-messages", payload);

      toast({
        title: "Message Transmitted.",
        description:
          "Thank you for reaching out. I'll get back to you shortly.",
        variant: "success",
      });

      form.reset();
    } catch (error) {
      toast({
        title: "Transmission Failed.",
        description: "An error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kontak diambil dari env supaya nilainya bisa diisi tanpa menyentuh kode.
  // Telepon SENGAJA disembunyikan bila kosong: sebelumnya nilainya masih
  // placeholder "+62" dengan tautan ke https://wa.me/62 — recruiter yang
  // mengkliknya mendarat di halaman WhatsApp yang tidak valid. Lebih baik
  // barisnya absen daripada menawarkan kontak yang tidak bisa dihubungi.
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "paranditha@gmail.com";
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;
  const location =
    process.env.NEXT_PUBLIC_CONTACT_LOCATION ?? "Tangerang Selatan, ID";

  const contactInfo: {
    title: string;
    value: string;
    href?: string;
  }[] = [
    {
      title: "Email",
      value: email,
      href: `mailto:${email}`,
    },
    ...(phone
      ? [
          {
            title: "WhatsApp",
            value: phone,
            // wa.me hanya menerima angka: buang spasi, tanda plus, dan tanda hubung.
            href: `https://wa.me/${phone.replace(/\D/g, "")}`,
          },
        ]
      : []),
    {
      // Lokasi bukan aksi — dulu ditautkan ke situs kantor, yang membingungkan.
      // Kini teks biasa tanpa tautan.
      title: "Location",
      value: location,
    },
  ];

  return (
    <section
      ref={ref}
      className="w-full bg-zinc-950 pt-32 pb-32"
      id="contact"
      aria-labelledby="contact-heading"
    >
      <div className="container mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col gap-16"
        >
          {/* Section Header */}
          <motion.div
            variants={itemVariants}
            className="border-thin flex flex-col gap-4 border-b pb-8"
          >
            <div className="eyebrow mb-4">[ INQUIRIES & COLLABORATION ]</div>
            <h2 id="contact-heading" className="section-title">
              Let&apos;s build <br /> something bold.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8">
            {/* Contact Info */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-12 lg:col-span-4"
            >
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
            </motion.div>

            {/* Contact Form */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-8 lg:pl-12"
            >
              <form
                onSubmit={handleSubmit}
                className="border-thin flex w-full max-w-2xl flex-col gap-8 border p-8 md:p-12"
              >
                <h3 className="border-thin mb-2 border-b pb-4 text-2xl font-bold tracking-widest uppercase">
                  Send a Dispatch
                </h3>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="eyebrow">
                      Name
                    </label>
                    <Input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      className="border-b-border h-12 rounded-none border-x-0 border-t-0 bg-transparent px-0 focus-visible:border-b-2 focus-visible:border-b-white"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="eyebrow">
                      Email
                    </label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      className="border-b-border h-12 rounded-none border-x-0 border-t-0 bg-transparent px-0 focus-visible:border-b-2 focus-visible:border-b-white"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-subject" className="eyebrow">
                    Subject
                  </label>
                  <Input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    className="border-b-border h-12 rounded-none border-x-0 border-t-0 bg-transparent px-0 focus-visible:border-b-2 focus-visible:border-b-white"
                    placeholder="Project Inquiry"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-message" className="eyebrow">
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    className="border-b-border resize-none rounded-none border-x-0 border-t-0 bg-transparent px-0 pt-4 focus-visible:border-b-2 focus-visible:border-b-white"
                    placeholder="Tell me about your idea..."
                  />
                </div>

                <div className="mt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="bg-foreground text-background hover:text-foreground border-thin w-full border px-12 transition-colors duration-300 hover:bg-transparent md:w-auto"
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">TRANSMITTING...</span>
                    ) : (
                      <>
                        Submit{" "}
                        <MoveRight
                          className="ml-2 h-4 w-4"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
