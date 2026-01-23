import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useValuation } from "@/context/ValuationContext";
import { defaultCountries } from "@/lib/valuation/country";

export default function CountrySettingsPage() {
  const {
    country,
    setCountry,
    reportingCurrency,
    setReportingCurrency,
    valuationCurrency,
    setValuationCurrency,
    fxRate,
    setFxRate,
  } = useValuation();

  const selected = useMemo(
    () => defaultCountries.find((item) => item.id === country.id) ?? country,
    [country]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Country & Market Settings</h1>
        <p className="text-sm text-muted-foreground">
          Edit macro inputs, default spreads, and FX conversions to align valuations with local markets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Country profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select
              value={selected.id}
              onValueChange={(value) => {
                const updated = defaultCountries.find((item) => item.id === value);
                if (updated) setCountry(updated);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {defaultCountries.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Risk-free rate</Label>
            <Input
              value={country.riskFreeRate}
              onChange={(event) => setCountry({ ...country, riskFreeRate: Number(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Curve: {country.riskFreeCurve} term</p>
          </div>
          <div className="space-y-2">
            <Label>Equity risk premium</Label>
            <Input
              value={country.equityRiskPremium}
              onChange={(event) => setCountry({ ...country, equityRiskPremium: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Inflation</Label>
            <Input
              value={country.inflation}
              onChange={(event) => setCountry({ ...country, inflation: Number(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Toggle real vs nominal in model settings.</p>
          </div>
          <div className="space-y-2">
            <Label>Corporate tax rate</Label>
            <Input
              value={country.taxRate}
              onChange={(event) => setCountry({ ...country, taxRate: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Country risk premium</Label>
            <Input
              value={country.countryRiskPremium}
              onChange={(event) => setCountry({ ...country, countryRiskPremium: Number(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Add-on to cost of equity (can be 0).</p>
          </div>
          <div className="space-y-2">
            <Label>Sovereign spread add-on</Label>
            <Input
              value={country.sovereignSpread}
              onChange={(event) => setCountry({ ...country, sovereignSpread: Number(event.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Add-on to cost of debt (can be 0).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default spreads by rating</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {country.defaultSpreads.map((spread, index) => (
            <div key={spread.rating} className="flex items-center gap-3">
              <span className="w-12 text-sm font-medium text-muted-foreground">{spread.rating}</span>
              <Input
                value={spread.spread}
                onChange={(event) => {
                  const updated = [...country.defaultSpreads];
                  updated[index] = { ...spread, spread: Number(event.target.value) };
                  setCountry({ ...country, defaultSpreads: updated });
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency & FX conversion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Reporting currency</Label>
            <Input value={reportingCurrency} onChange={(event) => setReportingCurrency(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valuation currency</Label>
            <Input value={valuationCurrency} onChange={(event) => setValuationCurrency(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>FX rate</Label>
            <Input value={fxRate} onChange={(event) => setFxRate(Number(event.target.value))} />
            <p className="text-xs text-muted-foreground">Toggle statement conversion in model settings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
