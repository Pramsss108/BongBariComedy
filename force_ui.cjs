const fs = require('fs');
let admin = fs.readFileSync('client/src/pages/admin.tsx', 'utf-8');

const tabListCode = <TabsTrigger value="proxies" className="flex items-center gap-2"><Bot className="h-4 w-4" /> Proxies</TabsTrigger>;
if (!admin.includes('value="proxies"')) {
    admin = admin.replace('<TabsList className="grid w-full grid-cols-4">', '<TabsList className="grid w-full grid-cols-5">\n          ' + tabListCode);
}

const tabContentCode = 
        <TabsContent value="proxies" className="mt-8 space-y-6">
          <Card className="border-brand-primary/20 bg-white">
            <CardHeader className="bg-brand-primary/5 border-b border-brand-primary/10">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-brand-primary">
                <Bot className="h-6 w-6" />
                Live Red Team Proxy Tracker (Phase 1)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DatabaseProxyUI />
            </CardContent>
          </Card>
        </TabsContent>;

if (!admin.includes('<TabsContent value="proxies"')) {
    admin = admin.replace('</Tabs>\n      </div>\n    </div>', tabContentCode + '\n      </Tabs>\n      </div>\n    </div>');
}

const reactComponent = 
function DatabaseProxyUI() {
    const { data, isLoading, refetch } = useQuery({ queryKey: ["/api/admin/proxy-status"] });
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <Badge variant={data?.poolSize > 0 ? "default" : "destructive"} className="text-base px-3 py-1">
                   Active Nodes: {data?.poolSize || 0}
                </Badge>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="flex gap-2">
                    <Bot className="h-4 w-4" /> Refresh Network
                </Button>
            </div>
            {isLoading ? <p>Scanning RAM...</p> : (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex flex-col gap-[1px]">
                    {data?.proxies?.map((ip: string, i: number) => (
                        <div key={i} className="p-3 bg-white font-mono text-sm text-green-700 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <span className="font-semibold">{ip}</span>
                            <span className="text-xs text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">Healthy</span>
                        </div>
                    ))}
                    {(!data?.proxies || data.proxies.length === 0) && (
                        <div className="p-4 text-center text-gray-500 bg-white">No active proxies found. Auto-healing required.</div>
                    )}
                </div>
            )}
        </div>
    )
}
;

if (!admin.includes('DatabaseProxyUI')) {
    admin = admin.replace('const Admin = () => {', reactComponent + '\nconst Admin = () => {');
}

fs.writeFileSync('client/src/pages/admin.tsx', admin);
console.log("Updated Admin UI with Proxy Tab successfully");
