import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MessageSquare, Clock, MapPin, HelpCircle } from "lucide-react";
import Footer from "@/components/footer";
import { useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Support() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent",
      description: "We'll get back to you within 24 hours.",
    });
    setName("");
    setEmail("");
    setMessage("");
  };

  const faqs = [
    {
      question: "How do I track my order?",
      answer: "Log in to your account and go to 'Track Your Order' section. You can also find tracking details in the confirmation email."
    },
    {
      question: "What are the delivery timings?",
      answer: "Fresh milk is delivered between 5 AM - 8 AM. Other products are delivered between 9 AM - 6 PM."
    },
    {
      question: "Can I cancel my order?",
      answer: "Orders can be cancelled before dispatch. Once dispatched, cancellation is not possible for perishable items."
    },
    {
      question: "How do I become a dealer?",
      answer: "Visit our 'Partner with Us' page or contact your nearest District Union to apply for dealership."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Customer Support</h1>
          <p className="text-cyan-100 mt-1 sm:mt-2 text-sm sm:text-base">We're here to help you 24/7</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Card className="text-center p-4 sm:p-6">
            <CardContent className="pt-2 sm:pt-4 p-0 sm:p-6">
              <Phone className="h-8 w-8 sm:h-10 sm:w-10 text-cyan-600 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-semibold text-lg mb-2">Call Us</h3>
              <p className="text-gray-600 text-sm mb-2">Toll Free (24/7)</p>
              <p className="text-cyan-600 font-bold">1800-425-3300</p>
            </CardContent>
          </Card>
          <Card className="text-center p-4 sm:p-6">
            <CardContent className="pt-2 sm:pt-4 p-0 sm:p-6">
              <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-semibold text-lg mb-2">Email Us</h3>
              <p className="text-gray-600 text-sm mb-2">Response within 24 hrs</p>
              <p className="text-green-600 font-bold">support@aavincart.com</p>
            </CardContent>
          </Card>
          <Card className="text-center p-4 sm:p-6">
            <CardContent className="pt-2 sm:pt-4 p-0 sm:p-6">
              <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-semibold text-lg mb-2">WhatsApp</h3>
              <p className="text-gray-600 text-sm mb-2">Quick assistance</p>
              <p className="text-blue-600 font-bold">+91 98437 77277</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-cyan-600" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base font-semibold">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Send us a Message</h2>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input 
                      type="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <Textarea 
                      value={message} 
                      onChange={(e) => setMessage(e.target.value)} 
                      placeholder="How can we help you?"
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-cyan-50 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-cyan-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Head Office</h3>
                <p className="text-gray-600">
                  Tamil Nadu Cooperative Milk Producers' Federation Ltd<br />
                  Aavin Illam, Madhavaram Milk Colony<br />
                  Chennai - 600 051, Tamil Nadu
                </p>
                <p className="text-gray-600 mt-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Mon - Sat: 9:00 AM - 6:00 PM
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
