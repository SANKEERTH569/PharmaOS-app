import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Store, UserRound, BriefcaseBusiness } from 'lucide-react';

const roles = [
  {
    title: 'Main Wholesaler',
    desc: 'Manage catalog, supply orders, and sub-wholesaler network.',
    icon: Building2,
  },
  {
    title: 'Sub-Wholesaler',
    desc: 'Handle orders, inventory, collections, and GST returns.',
    icon: BriefcaseBusiness,
  },
  {
    title: 'Retailer',
    desc: 'Browse catalogues, place orders, and track delivery status.',
    icon: Store,
  },
  {
    title: 'Salesman (MR)',
    desc: 'Manage beat routes, call reports, and collections in field.',
    icon: UserRound,
  },
];

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">P</div>
            <span className="text-lg font-extrabold tracking-tight">Pharma Head</span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            Login
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <p className="mb-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Pharma Distribution OS
          </p>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            One platform for your complete pharma supply chain.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium text-slate-600 sm:text-lg">
            Start from landing page at root domain, then continue to role-based login and dashboards for wholesalers, retailers, salesmen, and admins.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              Go To Login
              <ArrowRight size={16} />
            </Link>
            <a
              href="#roles"
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              View Role Access
            </a>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div key={role.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{role.title}</h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{role.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
