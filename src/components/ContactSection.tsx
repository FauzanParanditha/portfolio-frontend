"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import publicClient from "@/lib/axios/public";
import { motion, useInView } from "framer-motion";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useRef, useState } from "react";

export const ContactSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
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
        title: "Form belum lengkap",
        description: "Mohon isi semua field yang bertanda *.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await publicClient.post("/contact-messages", payload);

      toast({
        title: "Message sent!",
        description: "Thank you for your message. I'll get back to you soon!",
      });

      form.reset();
    } catch (error) {
      // error umum sudah di-handle interceptor, tapi kita tambahin pesan ekstra
      toast({
        title: "Gagal mengirim pesan",
        description:
          "Terjadi kesalahan saat mengirim pesan. Silakan coba lagi beberapa saat.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "paranditha@gmail.com",
      href: "mailto:paranditha@gmail.com",
    },
    {
      icon: Phone,
      title: "Phone",
      value: "+62",
      href: "https://wa.me/62",
    },
    {
      icon: MapPin,
      title: "Location",
      value: "Tangerang Selatan, Indonesia",
      href: "https://pandi.id",
    },
  ];

  return (
    <section ref={ref} className="bg-card/30 px-6 py-20" id="contact">
      <div className="container mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mb-16 text-center"
        >
          <motion.h2
            variants={itemVariants}
            className="mb-6 bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
          >
            Get In Touch
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mx-auto max-w-2xl text-lg text-muted-foreground"
          >
            Ready to start your next project? Let&apos;s discuss how we can work
            together to bring your ideas to life.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Contact Info */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="space-y-8"
          >
            <motion.div variants={itemVariants}>
              <h3 className="mb-6 text-2xl font-bold">Let&apos;s Connect</h3>
              <p className="mb-8 leading-relaxed text-muted-foreground">
                I&apos;m always open to discussing new opportunities,
                interesting projects, or just having a chat about web
                development. Don&apos;t hesitate to reach out!
              </p>
            </motion.div>

            {contactInfo.map((item) => (
              <motion.a
                key={item.title}
                variants={itemVariants}
                href={item.href}
                whileHover={{ scale: 1.02, x: 10 }}
                className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all duration-300 hover:shadow-card"
              >
                <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-muted-foreground">{item.value}</p>
                </div>
              </motion.a>
            ))}

            <motion.div
              variants={itemVariants}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <h4 className="mb-3 font-bold">Quick Response Time</h4>
              <p className="text-sm text-muted-foreground">
                I typically respond to messages within 24 hours. For urgent
                inquiries, please feel free to call directly.
              </p>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="flex items-stretch"
          >
            <div className="max-h-fit rounded-xl border border-border bg-card p-8 shadow-card">
              <h3 className="mb-6 text-2xl font-bold">Send a Message</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium"
                    >
                      Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Your name"
                      className="border-border bg-background"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium"
                    >
                      Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      className="border-border bg-background"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-sm font-medium"
                  >
                    Subject *
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    placeholder="Project inquiry, collaboration, etc."
                    className="border-border bg-background"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-2 block text-sm font-medium"
                  >
                    Message *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    placeholder="Tell me about your project, ideas, or how I can help..."
                    className="resize-none border-border bg-background"
                  />
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-primary transition-all duration-300 hover:shadow-glow"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent"
                      />
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
