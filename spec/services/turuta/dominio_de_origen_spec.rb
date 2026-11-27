# [turuta] Volver al dominio de origen al conectar Instagram o TikTok (docs/21 § 4.4 en crm-inmobi)
require 'rails_helper'

RSpec.describe Turuta::DominioDeOrigen do
  let(:principal) { 'https://app.crm.test' }
  let(:extra) { 'flyboard.crm.test, crm.cliente.test' }

  describe '.extra' do
    it 'acepta un dominio de CHATWOOT_HOSTS_EXTRA, sin importar mayusculas ni separadores' do
      expect(described_class.extra('crm.cliente.test', principal, extra)).to eq('crm.cliente.test')
      expect(described_class.extra('Flyboard.CRM.test', principal, 'flyboard.crm.test crm.cliente.test')).to eq('flyboard.crm.test')
      expect(described_class.extra('crm.cliente.test', principal, 'https://crm.cliente.test/')).to eq('crm.cliente.test')
    end

    it 'deja fuera el principal, los que no estan en la lista y lo que no es un dominio' do
      expect(described_class.extra('app.crm.test', principal, "#{extra}, app.crm.test")).to be_nil
      expect(described_class.extra('malo.test', principal, extra)).to be_nil
      expect(described_class.extra('cliente.test', principal, extra)).to be_nil
      expect(described_class.extra('crm.cliente.test.malo.test', principal, extra)).to be_nil
      expect(described_class.extra('crm.cliente.test@malo.test', principal, 'crm.cliente.test@malo.test')).to be_nil
      expect(described_class.extra(nil, principal, extra)).to be_nil
      expect(described_class.extra('crm.cliente.test', principal, '')).to be_nil
    end

    it 'lee FRONTEND_URL y CHATWOOT_HOSTS_EXTRA del entorno' do
      with_modified_env FRONTEND_URL: principal, CHATWOOT_HOSTS_EXTRA: 'crm.cliente.test' do
        expect(described_class.extra('crm.cliente.test')).to eq('crm.cliente.test')
        expect(described_class.extra('flyboard.crm.test')).to be_nil
      end
    end
  end

  describe '.opciones_de_url' do
    it 'manda al dominio extra con https' do
      expect(described_class.opciones_de_url('crm.cliente.test', principal, extra)).to eq(host: 'crm.cliente.test', port: nil, protocol: 'https')
      expect(described_class.opciones_de_url('crm.cliente.test:8443', principal, 'crm.cliente.test:8443'))
        .to eq(host: 'crm.cliente.test', port: 8443, protocol: 'https')
    end

    it 'no cambia nada si no es un dominio extra' do
      expect(described_class.opciones_de_url('app.crm.test', principal, extra)).to eq({})
      expect(described_class.opciones_de_url('malo.test', principal, extra)).to eq({})
      expect(described_class.opciones_de_url(nil, principal, extra)).to eq({})
    end
  end
end
