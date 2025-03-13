"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Volume2,
  Users,
  FileText,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4">
          <Link className="flex items-center space-x-2 font-bold" href="/">
            <FileText className="h-6 w-6 text-white" />
            <span>AutoPDF</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Button
              className="bg-transparent hover:bg-transparent text-white border border-white cursor-pointer"
              onClick={() => {
                router.push("/app");
              }}
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Animated Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Curved Lines */}
          <svg
            className="absolute h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="grad1" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="50%" stopColor="white" stopOpacity="0.5" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="grad2" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="50%" stopColor="white" stopOpacity="0.5" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Top Curves */}
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
                repeatDelay: 1,
              }}
              d="M 100 100 Q 300 0 500 100 T 900 100"
              fill="none"
              stroke="url(#grad1)"
              strokeWidth="1"
            />
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
                repeatDelay: 1,
                delay: 0.5,
              }}
              d="M 0 200 Q 200 100 400 200 T 800 200"
              fill="none"
              stroke="url(#grad2)"
              strokeWidth="1"
            />

            {/* Bottom Curves */}
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
                repeatDelay: 1,
                delay: 1,
              }}
              d="M 100 600 Q 300 500 500 600 T 900 600"
              fill="none"
              stroke="url(#grad1)"
              strokeWidth="1"
            />
          </svg>

          {/* Straight Lines */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: "100%", opacity: 0 }}
                animate={{
                  x: "-100%",
                  opacity: [0, 0.7, 0.7, 0],
                }}
                transition={{
                  duration: 2.5,
                  delay: i * 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                  ease: "linear",
                }}
                className="absolute right-0"
                style={{
                  top: `${15 + i * 10}%`,
                  height: "1px",
                  width: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* Animated Background */}
        <div className="absolute inset-0 z-[1]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full bg-white/30 blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -right-1/4 top-1/2 h-96 w-96 rounded-full bg-white/30 blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-[3] px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mx-auto max-w-3xl space-y-8"
          >
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              AutoPDF
            </h1>
            <p className="text-lg text-white sm:text-xl">
              Transform the way you read, listen, and interact with PDFs.
            </p>

            <div className="flex justify-center space-x-4">
              <Button
                className="bg-gradient-to-r from-white to-white text-lg text-black hover:opacity-90 cursor-pointer"
                onClick={() => {
                  router.push("/app");
                }}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative z-10 border-t border-white/10 bg-black py-24"
      >
        <div className="px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Why AutoPDF?
            </h2>
            <p className="mt-4 text-gray-400">
              Easily converse, listen, and collaborate on any PDF document.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-white/50"
            >
              <MessageCircle className="mb-4 h-12 w-12 text-white" />
              <h3 className="mb-2 text-xl font-bold">Talk to Your PDF</h3>
              <p className="text-gray-400">
                Quickly ask questions or extract information from any PDF—
                without reading all the pages.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-white/50"
            >
              <Volume2 className="mb-4 h-12 w-12 text-white" />
              <h3 className="mb-2 text-xl font-bold">Select Your Voice</h3>
              <p className="text-gray-400">
                Have your PDF read aloud in the voice of your choice—perfect for
                multitasking or accessibility needs.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-white/50"
            >
              <Users className="mb-4 h-12 w-12 text-white" />
              <h3 className="mb-2 text-xl font-bold">Create Smart Agents</h3>
              <p className="text-gray-400">
                Chat with an AI agent about the currently selected page for
                deeper understanding and assistance.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 border-t border-white/10 bg-black py-24">
        <div className="px-4">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm md:p-12 lg:p-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Ready to Revolutionize Your PDF Experience?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Join those who rely on AutoPDF for efficient reading, instant
              audio, and intelligent discussions—beyond the static page.
            </p>
            <ul className="mx-auto mt-8 flex max-w-xl flex-col gap-4 text-left">
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Interactive PDF Conversations</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Customizable Voice Output</span>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-white" />
                <span>Smart AI Agents for In-Depth Guidance</span>
              </li>
            </ul>
            <Button
              className="mt-8 bg-gradient-to-r from-white to-white text-lg text-black hover:opacity-90 cursor-pointer"
              onClick={() => {
                router.push("/app");
              }}
            >
              Start Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-8">
        <div className="flex flex-col items-center justify-between space-y-4 px-4 md:flex-row md:space-y-0">
          <div className="flex items-center space-x-2">
            <Wallet className="h-6 w-6 text-white" />
            <span className="font-bold">AutoPDF</span>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} AutoPDF. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
