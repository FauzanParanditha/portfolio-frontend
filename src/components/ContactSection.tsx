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
        description: "Thank you for reaching out. I'll get back to you shortly.",
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

  const contactInfo = [
    {
      title: "Email",
      value: "paranditha@gmail.com",
      href: "mailto:paranditha@gmail.com",
    },
    {
      title: "Phone",
      value: "+62",
      href: "https://wa.me/62",
    },
    {
      title: "Location",
      value: "Tangerang Selatan, ID",
      href: "https://pandi.id",
    },
  ];

  return (
    <section ref={ref} className="w-full bg-background pt-32 pb-32" id="contact">
      <div className="container mx-auto px-6">
        <motion.div
           variants={containerVariants}
           initial="hidden"
           animate={isInView ? "visible" : "hidden"}
           className="flex flex-col gap-16"
        >
          {/* Section Header */}
          <motion.div variants={itemVariants} className="flex flex-col gap-4 border-b border-thin pb-8">
            <div className="uppercase text-xs tracking-widest text-muted-foreground font-mono mb-4">
              [ INQUIRIES & COLLABORATION ]
            </div>
            <h2 className="text-display font-bold uppercase tracking-tight leading-[0.9]">
              Let's build <br/> something bold.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
            {/* Contact Info */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-4 flex flex-col gap-12"
            >
              <p className="text-lg leading-relaxed opacity-80">
                 Whether you need an interactive frontend, a scalable backend, or a complete digital overhaul, I am ready to discuss your next project.
              </p>

              <div className="flex flex-col gap-6 w-full max-w-sm">
                {contactInfo.map((item, idx) => (
                  <a
                    key={item.title}
                    href={item.href}
                    className="group border-b border-thin pb-4 flex flex-col hover:opacity-70 transition-opacity"
                  >
                    <span className="font-mono text-xs opacity-50 uppercase tracking-widest mb-2">(0{idx+1}) {item.title}</span>
                    <span className="text-xl font-medium tracking-tight group-hover:underline underline-offset-4">{item.value}</span>
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-8 lg:pl-12"
            >
              <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full max-w-2xl border border-thin p-8 md:p-12">
                <h3 className="text-2xl font-bold uppercase tracking-widest border-b border-thin pb-4 mb-2">Send a Dispatch</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="font-mono text-xs uppercase tracking-widest opacity-70">Name</label>
                      <Input
                        name="name"
                        type="text"
                        required
                        className="rounded-none border-x-0 border-t-0 border-b-border bg-transparent focus-visible:ring-0 px-0 rounded-none h-12"
                        placeholder="John Doe"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="font-mono text-xs uppercase tracking-widest opacity-70">Email</label>
                      <Input
                        name="email"
                        type="email"
                        required
                        className="rounded-none border-x-0 border-t-0 border-b-border bg-transparent focus-visible:ring-0 px-0 rounded-none h-12"
                        placeholder="john@example.com"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-widest opacity-70">Subject</label>
                  <Input
                    name="subject"
                    type="text"
                    required
                    className="rounded-none border-x-0 border-t-0 border-b-border bg-transparent focus-visible:ring-0 px-0 rounded-none h-12"
                    placeholder="Project Inquiry"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-widest opacity-70">Message</label>
                  <Textarea
                    name="message"
                    required
                    rows={4}
                    className="rounded-none border-x-0 border-t-0 border-b-border bg-transparent focus-visible:ring-0 px-0 rounded-none resize-none pt-4"
                    placeholder="Tell me about your idea..."
                  />
                </div>

                <div className="mt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="bg-foreground text-background hover:bg-transparent hover:text-foreground border border-thin transition-colors duration-300 w-full md:w-auto px-12"
                  >
                    {isSubmitting ? (
                       <span className="animate-pulse">TRANSMITTING...</span>
                    ) : (
                      <>
                        Submit <MoveRight className="ml-2 h-4 w-4" />
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
