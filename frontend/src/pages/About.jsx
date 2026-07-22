import { ArrowRight, Brain, Database, FileImage, Languages, ScanText, Server, ShieldCheck, Type } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, PageHeader } from '../components/ui/Primitives';

const About = () => (
  <main className="page sg-about-page">
    <PageHeader
      eyebrow="Graduation project"
      title="About SomaliGuard AI"
      description="A web-based research system for detecting offensive and non-offensive Somali text from direct writing and social-media images."
      actions={<Link className="sg-button sg-button-primary" to="/predict-text">Start an analysis <ArrowRight size={16} /></Link>}
    />

    <div className="sg-about-lead">
      <section><ShieldCheck size={28} /><div><h2>The problem</h2><p>Large amounts of Somali social-media content are difficult to review manually. Text inside screenshots and memes also cannot be handled by an ordinary text-only classifier.</p></div></section>
      <section><Languages size={28} /><div><h2>The project response</h2><p>SomaliGuard AI connects OCR, Somali text preprocessing, SomBERTa classification, a Flask API, and saved user history in one traceable workflow.</p></div></section>
    </div>

    <Card title="Two supported analysis paths" description="Both paths use the same deployed classification model.">
      <div className="sg-path-grid">
        <article><span><Type size={21} /></span><div><h3>Direct text</h3><p>Somali text → preprocessing → tokenizer → SomBERTa → result and confidence</p><Link to="/predict-text">Analyze text <ArrowRight size={14} /></Link></div></article>
        <article><span><FileImage size={21} /></span><div><h3>Image with text</h3><p>Image → EasyOCR → preprocessing → tokenizer → SomBERTa → result and confidence</p><Link to="/analyze">Analyze image <ArrowRight size={14} /></Link></div></article>
      </div>
    </Card>

    <section className="sg-technology-section">
      <h2>Implemented technology layers</h2>
      <p>Each layer has one clear responsibility in the working system.</p>
      <div className="sg-technology-grid">
        <Tech icon={<Languages size={20} />} label="Frontend" title="React + Vite" text="Forms, dashboards, result views, history, authentication, and administration." />
        <Tech icon={<Server size={20} />} label="Application API" title="Python + Flask" text="Authentication, validation, preprocessing, OCR coordination, model inference, and JSON responses." />
        <Tech icon={<Brain size={20} />} label="AI processing" title="SomBERTa + PyTorch" text="Contextual binary classification of preprocessed Somali text." />
        <Tech icon={<ScanText size={20} />} label="Text extraction" title="EasyOCR" text="Reads text from uploaded JPG, JPEG, PNG, and WEBP images." />
        <Tech icon={<Database size={20} />} label="Data layer" title="MySQL" text="Stores user accounts, verification data, contact messages, and prediction history." />
      </div>
    </section>

    <div className="sg-scope-note"><strong>Current scope:</strong> Somali text, binary offensive/non-offensive classification, and image OCR. The system does not currently analyze audio, video, or multilingual content, and its results should support—not replace—human judgment.</div>
  </main>
);

const Tech = ({ icon, label, title, text }) => <article className="sg-tech-item"><span>{icon}</span><div><small>{label}</small><h3>{title}</h3><p>{text}</p></div></article>;
export default About;
